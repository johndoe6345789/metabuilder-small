#include "supabase_adapter.hpp"
#include <spdlog/spdlog.h>
#include <regex>
#include <stdexcept>

namespace dbal {
namespace adapters {
namespace supabase {

SupabaseAdapter::SupabaseAdapter(const SupabaseConfig& config)
    : useRestApi_(config.useRestApi) {

    if (config.url.empty()) {
        throw std::runtime_error("Supabase URL is required");
    }
    if (config.apiKey.empty() && useRestApi_) {
        throw std::runtime_error("Supabase API key is required for REST API mode");
    }

    // Load entity schemas from YAML
    core::EntitySchemaLoader loader;
    try {
        const std::string schemaPath = core::EntitySchemaLoader::getDefaultSchemaPath();
        schemas_ = loader.loadSchemas(schemaPath);
        spdlog::info("Loaded {} entity schemas", schemas_.size());
    } catch (const std::exception& e) {
        spdlog::warn("Failed to load entity schemas: {}", e.what());
    }

    // Initialize helpers for REST API mode
    if (useRestApi_) {
        http_client_ = std::make_unique<SupabaseHttpClient>(config.url, config.apiKey, config.timeout);
        auth_manager_ = std::make_unique<SupabaseAuthManager>(config.url, config.apiKey);
        rls_manager_ = std::make_unique<SupabaseRlsManager>();
        spdlog::info("Initialized Supabase REST API adapter");
    } else {
        // Initialize PostgreSQL adapter for PostgreSQL mode
        try {
            sql::SqlConnectionConfig sqlConfig;
            sqlConfig.host = "db." + extractProjectName(config.url) + ".supabase.co";
            sqlConfig.port = 5432;
            sqlConfig.database = "postgres";
            sqlConfig.user = "postgres";
            sqlConfig.password = config.postgresPassword;
            sqlConfig.max_connections = 10;
            postgresAdapter_ = std::make_unique<sql::PostgresAdapter>(sqlConfig);
            spdlog::info("Initialized Supabase PostgreSQL adapter");
        } catch (const std::exception& e) {
            throw std::runtime_error(std::string("Failed to initialize PostgreSQL adapter: ") + e.what());
        }
    }
}

// ===== Transaction Support =====

Result<bool> SupabaseAdapter::beginTransaction() {
    // In PostgreSQL mode, delegate to PostgresAdapter (native transactions)
    if (!useRestApi_ && postgresAdapter_) {
        return postgresAdapter_->beginTransaction();
    }

    // In REST API mode, use compensating transactions
    if (compensating_tx_ && compensating_tx_->isActive()) {
        return Error::internal("Transaction already in progress");
    }
    compensating_tx_ = std::make_unique<dbal::core::CompensatingTransaction>(*this);
    return Result<bool>(true);
}

Result<bool> SupabaseAdapter::commitTransaction() {
    if (!useRestApi_ && postgresAdapter_) {
        return postgresAdapter_->commitTransaction();
    }

    if (!compensating_tx_ || !compensating_tx_->isActive()) {
        return Error::internal("No transaction in progress");
    }
    compensating_tx_->commit();
    compensating_tx_.reset();
    return Result<bool>(true);
}

Result<bool> SupabaseAdapter::rollbackTransaction() {
    if (!useRestApi_ && postgresAdapter_) {
        return postgresAdapter_->rollbackTransaction();
    }

    if (!compensating_tx_ || !compensating_tx_->isActive()) {
        return Error::internal("No transaction in progress");
    }
    auto result = compensating_tx_->rollback();
    compensating_tx_.reset();
    return result;
}

// ===== CRUD Operations =====

Result<Json> SupabaseAdapter::create(const std::string& entityName, const Json& data) {
    if (!useRestApi_ && postgresAdapter_) {
        return postgresAdapter_->create(entityName, data);
    }

    auto result = http_client_->post(entityName, data);

    // Record operation for compensating transaction (REST API mode only)
    if (result.isOk() && compensating_tx_ && compensating_tx_->isActive()) {
        Json created = result.value();
        std::string id;
        if (created.is_array() && !created.empty() && created[0].contains("id")) {
            id = created[0]["id"].get<std::string>();
        } else if (created.contains("id")) {
            id = created["id"].get<std::string>();
        }
        compensating_tx_->recordCreate(entityName, id);
    }

    return result;
}

Result<Json> SupabaseAdapter::read(const std::string& entityName, const std::string& id) {
    if (!useRestApi_ && postgresAdapter_) {
        return postgresAdapter_->read(entityName, id);
    }

    const auto query = SupabaseQueryBuilder::buildReadQuery(entityName, id);
    auto result = http_client_->get(query);
    if (result.isError()) {
        return Error(result.error().code(), result.error().what());
    }

    // Supabase returns array, extract first element
    auto json = result.value();
    if (json.is_array() && !json.empty()) {
        return json[0];
    }

    return Error::notFound("Entity not found");
}

Result<Json> SupabaseAdapter::update(const std::string& entityName, const std::string& id, const Json& data) {
    if (!useRestApi_ && postgresAdapter_) {
        return postgresAdapter_->update(entityName, id, data);
    }

    // Snapshot old data for compensating transaction before update
    if (compensating_tx_ && compensating_tx_->isActive()) {
        auto oldData = read(entityName, id);
        if (oldData.isOk()) {
            compensating_tx_->recordUpdate(entityName, id, oldData.value());
        }
    }

    const auto query = SupabaseQueryBuilder::buildIdFilterQuery(entityName, id);
    auto result = http_client_->patch(query, data);
    if (result.isError()) {
        return Error(result.error().code(), result.error().what());
    }

    // Supabase returns array when using Prefer: return=representation
    auto json = result.value();
    if (json.is_array() && !json.empty()) {
        return json[0];
    }

    return Error::notFound("Entity not found after update");
}

Result<bool> SupabaseAdapter::remove(const std::string& entityName, const std::string& id) {
    if (!useRestApi_ && postgresAdapter_) {
        return postgresAdapter_->remove(entityName, id);
    }

    // Snapshot old data for compensating transaction before delete
    if (compensating_tx_ && compensating_tx_->isActive()) {
        auto oldData = read(entityName, id);
        if (oldData.isOk()) {
            compensating_tx_->recordDelete(entityName, oldData.value());
        }
    }

    const auto query = SupabaseQueryBuilder::buildIdFilterQuery(entityName, id);
    return http_client_->deleteRequest(query);
}

Result<ListResult<Json>> SupabaseAdapter::list(const std::string& entityName, const ListOptions& options) {
    if (!useRestApi_ && postgresAdapter_) {
        return postgresAdapter_->list(entityName, options);
    }

    const auto query = SupabaseQueryBuilder::buildListQuery(entityName, options);
    auto result = http_client_->get(query);
    if (result.isError()) {
        return Error(result.error().code(), result.error().what());
    }

    ListResult<Json> listResult;
    auto json = result.value();

    if (json.is_array()) {
        listResult.items = json.get<std::vector<Json>>();
        listResult.total = static_cast<int>(json.size());
    } else {
        listResult.total = 0;
    }

    listResult.page = options.page;
    listResult.limit = options.limit > 0 ? options.limit : 50;

    return listResult;
}

Result<int> SupabaseAdapter::createMany(const std::string& entityName, const std::vector<Json>& records) {
    if (!useRestApi_ && postgresAdapter_) {
        return postgresAdapter_->createMany(entityName, records);
    }

    Json payload = Json::array();
    for (const auto& record : records) {
        payload.push_back(record);
    }

    auto result = http_client_->post(entityName, payload);
    if (result.isError()) {
        return Error(result.error().code(), result.error().what());
    }

    auto json = result.value();
    if (json.is_array()) {
        return static_cast<int>(json.size());
    }

    return 0;
}

Result<int> SupabaseAdapter::updateMany(const std::string& entityName, const Json& filter, const Json& data) {
    if (!useRestApi_ && postgresAdapter_) {
        return postgresAdapter_->updateMany(entityName, filter, data);
    }

    std::string query = entityName;
    if (!filter.empty()) {
        query += "?" + SupabaseQueryBuilder::buildFilterQuery(filter);
    }

    auto result = http_client_->patch(query, data);
    if (result.isError()) {
        return Error(result.error().code(), result.error().what());
    }

    auto json = result.value();
    if (json.is_array()) {
        return static_cast<int>(json.size());
    }

    return 0;
}

Result<int> SupabaseAdapter::deleteMany(const std::string& entityName, const Json& filter) {
    if (!useRestApi_ && postgresAdapter_) {
        return postgresAdapter_->deleteMany(entityName, filter);
    }

    std::string query = entityName;
    if (!filter.empty()) {
        query += "?" + SupabaseQueryBuilder::buildFilterQuery(filter);
    }

    auto result = http_client_->deleteRequest(query);
    if (result.isError()) {
        return Error(result.error().code(), result.error().what());
    }

    return 1;  // Supabase doesn't return count by default
}

Result<Json> SupabaseAdapter::findFirst(const std::string& entityName, const Json& filter) {
    if (!useRestApi_ && postgresAdapter_) {
        return postgresAdapter_->findFirst(entityName, filter);
    }

    ListOptions options;
    options.limit = 1;
    options.page = 1;

    auto result = list(entityName, options);
    if (result.isError()) {
        return Error(result.error().code(), result.error().what());
    }

    const auto& listResult = result.value();
    if (!listResult.items.empty()) {
        return listResult.items[0];
    }

    return Error::notFound("No matching entity found");
}

Result<Json> SupabaseAdapter::findByField(const std::string& entityName, const std::string& field, const Json& value) {
    if (!useRestApi_ && postgresAdapter_) {
        return postgresAdapter_->findByField(entityName, field, value);
    }

    Json filter;
    filter[field] = value;
    return findFirst(entityName, filter);
}

Result<Json> SupabaseAdapter::upsert(const std::string& entityName, const std::string& uniqueField, const Json& uniqueValue, const Json& createData, const Json& updateData) {
    if (!useRestApi_ && postgresAdapter_) {
        return postgresAdapter_->upsert(entityName, uniqueField, uniqueValue, createData, updateData);
    }

    // Supabase supports upsert via POST with Prefer: resolution=merge-duplicates
    Json upsertData = createData;
    upsertData[uniqueField] = uniqueValue;

    // Add update fields
    for (auto it = updateData.begin(); it != updateData.end(); ++it) {
        upsertData[it.key()] = it.value();
    }

    auto result = http_client_->post(entityName, upsertData);
    if (result.isError()) {
        return Error(result.error().code(), result.error().what());
    }

    auto json = result.value();
    if (json.is_array() && !json.empty()) {
        return json[0];
    }

    return Error::internal("Upsert failed to return data");
}

Result<std::vector<std::string>> SupabaseAdapter::getAvailableEntities() {
    std::vector<std::string> entities;
    for (const auto& [name, schema] : schemas_) {
        entities.push_back(name);
    }
    return entities;
}

Result<EntitySchema> SupabaseAdapter::getEntitySchema(const std::string& entityName) {
    auto it = schemas_.find(entityName);
    if (it == schemas_.end()) {
        return Error::notFound("Schema not found for entity: " + entityName);
    }

    // Convert core::EntitySchema to adapters::EntitySchema
    const auto& coreSchema = it->second;
    EntitySchema schema;
    schema.name = coreSchema.name;
    schema.displayName = coreSchema.displayName;
    for (const auto& coreField : coreSchema.fields) {
        EntityField field;
        field.name = coreField.name;
        field.type = coreField.type;
        field.required = coreField.required;
        field.unique = coreField.unique;
        if (coreField.defaultValue.has_value()) {
            field.defaultValue = coreField.defaultValue.value();
        }
        schema.fields.push_back(field);
    }
    return schema;
}

void SupabaseAdapter::close() {
    if (!useRestApi_ && postgresAdapter_) {
        postgresAdapter_->close();
    }
}

std::string SupabaseAdapter::extractProjectName(const std::string& supabaseUrl) {
    std::regex projectRegex(R"(https?://([^.]+)\.supabase\.)");
    std::smatch match;

    if (std::regex_search(supabaseUrl, match, projectRegex) && match.size() > 1) {
        return match[1].str();
    }

    throw std::runtime_error("Invalid Supabase URL format. Expected: https://your-project.supabase.co");
}

std::string SupabaseAdapter::buildPostgresConnectionString(const SupabaseConfig& config) {
    const std::string projectName = extractProjectName(config.url);

    if (config.postgresPassword.empty()) {
        throw std::runtime_error("PostgreSQL password is required for PostgreSQL mode");
    }

    std::ostringstream connStr;
    connStr << "postgresql://postgres:" << config.postgresPassword
            << "@db." << projectName << ".supabase.co:5432/postgres";

    return connStr.str();
}

} // namespace supabase
} // namespace adapters
} // namespace dbal
