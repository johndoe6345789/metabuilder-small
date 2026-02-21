#include "sql_adapter_base.hpp"
#include "../../config/env_config.hpp"
#include "../schema_loader.hpp"
#include "../sql_template_generator.hpp"
#include <algorithm>
#include <spdlog/spdlog.h>

namespace dbal {
namespace adapters {
namespace sql {

// ===== Schema Loading =====

void SqlAdapter::loadSchemas() {
    using namespace dbal::config;

    std::string schema_dir;
    try {
        schema_dir = EnvConfig::getSchemaDir();
    } catch (const std::exception& e) {
        spdlog::warn("DBAL_SCHEMA_DIR not set, no entity schemas loaded: {}", e.what());
        return;
    }

    spdlog::info("Loading entity schemas from: {}", schema_dir);
    auto entities = SchemaLoader::loadFromDirectory(schema_dir);
    spdlog::info("Loaded {} entity definitions from YAML", entities.size());

    for (const auto& entity : entities) {
        EntitySchema schema;
        schema.name = entity.name;
        schema.displayName = entity.name;

        for (const auto& field : entity.fields) {
            EntityField ef;
            ef.name = field.name;
            ef.type = field.type;
            ef.required = field.required || field.primary;
            ef.unique = field.unique || field.primary;
            ef.defaultValue = field.default_value;
            schema.fields.push_back(ef);
        }

        // Register under PascalCase name
        schemas_[entity.name] = schema;

        // Also register under lowercase name for case-insensitive lookups
        std::string lower_name = entity.name;
        std::transform(lower_name.begin(), lower_name.end(), lower_name.begin(),
                       [](unsigned char c) { return std::tolower(c); });
        if (lower_name != entity.name) {
            schemas_[lower_name] = schema;
        }

        spdlog::debug("Registered entity schema: {} ({} fields)", entity.name, entity.fields.size());
    }
}

void SqlAdapter::createTables() {
    using namespace dbal::config;

    std::string schema_dir;
    std::string template_dir;
    try {
        schema_dir = EnvConfig::getSchemaDir();
        template_dir = EnvConfig::getTemplateDir();
    } catch (const std::exception& e) {
        spdlog::warn("Schema/template dirs not configured, skipping table creation: {}", e.what());
        return;
    }

    auto conn = pool_.acquire();
    if (!conn) {
        throw std::runtime_error("Unable to acquire SQL connection for table creation");
    }
    ConnectionGuard guard(pool_, conn);

    // Load all entity definitions from YAML
    spdlog::info("Loading schemas from: {}", schema_dir);
    auto entities = SchemaLoader::loadFromDirectory(schema_dir);
    spdlog::info("Loaded {} entity definitions", entities.size());

    // Create SQL template generator
    spdlog::info("Using templates from: {}", template_dir);
    SqlTemplateGenerator generator(template_dir);

    // Determine SQL dialect for template generation
    SqlDialect sql_dialect;
    if (dialect_ == Dialect::Postgres || dialect_ == Dialect::Prisma) {
        sql_dialect = SqlDialect::PostgreSQL;
    } else {
        sql_dialect = SqlDialect::MySQL;
    }

    // Generate and execute CREATE TABLE for each entity
    for (const auto& entity : entities) {
        // Generate CREATE TABLE SQL
        std::string create_sql = generator.generateCreateTable(entity, sql_dialect);

        // Execute CREATE TABLE
        try {
            executeNonQuery(conn, create_sql, {});
        } catch (const SqlError& err) {
            throw std::runtime_error("Failed to create table " + entity.name + ": " + err.message);
        }

        // Generate and execute CREATE INDEX statements
        auto index_statements = generator.generateIndexes(entity, sql_dialect);
        for (const auto& index_sql : index_statements) {
            try {
                executeNonQuery(conn, index_sql, {});
            } catch (const SqlError&) {
                // Index might already exist, ignore error
            }
        }
    }
}

// ===== Metadata =====

Result<std::vector<std::string>> SqlAdapter::getAvailableEntities() {
    std::vector<std::string> entities;
    entities.reserve(schemas_.size());
    for (const auto& [name, _] : schemas_) {
        entities.push_back(name);
    }
    return Result<std::vector<std::string>>(entities);
}

Result<EntitySchema> SqlAdapter::getEntitySchema(const std::string& entityName) {
    auto schemaResult = getEntitySchemaInternal(entityName);
    if (!schemaResult) {
        return Error::validationError("Unknown entity: " + entityName);
    }
    return Result<EntitySchema>(*schemaResult);
}

void SqlAdapter::close() {
    // Connections will tear down automatically via RAII in the pool.
}

// ===== Protected Methods =====

std::optional<EntitySchema> SqlAdapter::getEntitySchemaInternal(const std::string& entityName) const {
    auto it = schemas_.find(entityName);
    if (it != schemas_.end()) {
        return it->second;
    }
    return std::nullopt;
}

}
}
}
