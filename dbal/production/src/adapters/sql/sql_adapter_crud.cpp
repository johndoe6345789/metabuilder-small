#include "sql_adapter_base.hpp"

namespace dbal {
namespace adapters {
namespace sql {

// ===== Generic CRUD Operations =====

Result<Json> SqlAdapter::create(const std::string& entityName, const Json& data) {
    auto schemaResult = getEntitySchemaInternal(entityName);
    if (!schemaResult) {
        return Error::validationError("Unknown entity: " + entityName);
    }
    const auto& schema = *schemaResult;

    auto conn = pool_.acquire();
    if (!conn) {
        return Error::internal("Unable to acquire SQL connection");
    }
    ConnectionGuard guard(pool_, conn);

    const std::string sql = buildInsertSql(schema, data);
    const auto params = jsonToParams(schema, data);

    try {
        const auto rows = executeQuery(conn, sql, params);
        if (rows.empty()) {
            return Error::internal("SQL insert returned no rows");
        }
        return rowToJson(schema, rows.front());
    } catch (const SqlError& err) {
        return mapSqlError(err);
    }
}

Result<Json> SqlAdapter::read(const std::string& entityName, const std::string& id) {
    auto schemaResult = getEntitySchemaInternal(entityName);
    if (!schemaResult) {
        return Error::validationError("Unknown entity: " + entityName);
    }
    const auto& schema = *schemaResult;

    auto conn = pool_.acquire();
    if (!conn) {
        return Error::internal("Unable to acquire SQL connection");
    }
    ConnectionGuard guard(pool_, conn);

    const std::string sql = buildSelectSql(schema, Json{{"id", id}});
    const std::vector<SqlParam> params = {{"id", id}};

    try {
        const auto rows = executeQuery(conn, sql, params);
        if (rows.empty()) {
            return Error::notFound(entityName + " not found");
        }
        return rowToJson(schema, rows.front());
    } catch (const SqlError& err) {
        return mapSqlError(err);
    }
}

Result<Json> SqlAdapter::update(const std::string& entityName, const std::string& id, const Json& data) {
    auto schemaResult = getEntitySchemaInternal(entityName);
    if (!schemaResult) {
        return Error::validationError("Unknown entity: " + entityName);
    }
    const auto& schema = *schemaResult;

    auto conn = pool_.acquire();
    if (!conn) {
        return Error::internal("Unable to acquire SQL connection");
    }
    ConnectionGuard guard(pool_, conn);

    const std::string sql = buildUpdateSql(schema, id, data);
    const auto params = jsonToParams(schema, data, id);

    try {
        const auto rows = executeQuery(conn, sql, params);
        if (rows.empty()) {
            return Error::notFound(entityName + " not found");
        }
        return rowToJson(schema, rows.front());
    } catch (const SqlError& err) {
        return mapSqlError(err);
    }
}

Result<bool> SqlAdapter::remove(const std::string& entityName, const std::string& id) {
    auto schemaResult = getEntitySchemaInternal(entityName);
    if (!schemaResult) {
        return Error::validationError("Unknown entity: " + entityName);
    }
    const auto& schema = *schemaResult;

    auto conn = pool_.acquire();
    if (!conn) {
        return Error::internal("Unable to acquire SQL connection");
    }
    ConnectionGuard guard(pool_, conn);

    const std::string sql = buildDeleteSql(schema, id);
    const std::vector<SqlParam> params = {{"id", id}};

    try {
        const int affected = executeNonQuery(conn, sql, params);
        if (affected == 0) {
            return Error::notFound(entityName + " not found");
        }
        return Result<bool>(true);
    } catch (const SqlError& err) {
        return mapSqlError(err);
    }
}

Result<ListResult<Json>> SqlAdapter::list(const std::string& entityName, const ListOptions& options) {
    auto schemaResult = getEntitySchemaInternal(entityName);
    if (!schemaResult) {
        return Error::validationError("Unknown entity: " + entityName);
    }
    const auto& schema = *schemaResult;

    auto conn = pool_.acquire();
    if (!conn) {
        return Error::internal("Unable to acquire SQL connection");
    }
    ConnectionGuard guard(pool_, conn);

    const int limit = options.limit > 0 ? options.limit : 50;
    const int offset = options.page > 1 ? (options.page - 1) * limit : 0;

    // Build filter clause from all filter parameters
    std::string whereClause;
    std::vector<SqlParam> params;
    int paramIndex = 1;

    if (!options.filter.empty()) {
        std::vector<std::string> conditions;
        for (const auto& [key, value] : options.filter) {
            conditions.push_back(quoteId(key) + " = " + placeholder(paramIndex++));
            params.push_back({key, value});
        }
        whereClause = " WHERE " + joinFragments(conditions, " AND ");
    }

    // Determine ORDER BY field — use createdAt if it exists, otherwise primary key
    std::string orderField = schema.fields.empty() ? "id" : schema.fields[0].name;
    for (const auto& field : schema.fields) {
        if (field.name == "createdAt") {
            orderField = "createdAt";
            break;
        }
    }

    // Build SQL
    const std::string tableName = quoteId(schema.name);
    const std::string fieldList = buildFieldList(schema);
    const std::string sql = "SELECT " + fieldList +
                            " FROM " + tableName + whereClause +
                            " ORDER BY " + quoteId(orderField) + " DESC LIMIT " + placeholder(paramIndex++) +
                            " OFFSET " + placeholder(paramIndex++);
    params.push_back({"limit", std::to_string(limit)});
    params.push_back({"offset", std::to_string(offset)});

    try {
        const auto rows = executeQuery(conn, sql, params);
        std::vector<Json> items;
        items.reserve(rows.size());
        for (const auto& row : rows) {
            items.push_back(rowToJson(schema, row));
        }

        ListResult<Json> result;
        result.items = items;
        result.total = static_cast<int>(items.size());
        result.page = options.page;
        result.limit = limit;
        return Result<ListResult<Json>>(result);
    } catch (const SqlError& err) {
        return mapSqlError(err);
    }
}

// ===== Transaction Operations =====

Result<bool> SqlAdapter::beginTransaction() {
    if (!tx_connection_) {
        tx_connection_ = pool_.acquire();
        if (!tx_connection_) {
            return Error::internal("Unable to acquire SQL connection for transaction");
        }
        tx_manager_ = std::make_unique<SqlTransactionManager>(tx_connection_);
    }
    tx_manager_->begin();
    return Result<bool>(true);
}

Result<bool> SqlAdapter::commitTransaction() {
    if (!tx_manager_ || !tx_manager_->isActive()) {
        return Error::internal("No transaction in progress");
    }
    tx_manager_->commit();
    tx_manager_.reset();
    pool_.release(tx_connection_);
    tx_connection_ = nullptr;
    return Result<bool>(true);
}

Result<bool> SqlAdapter::rollbackTransaction() {
    if (!tx_manager_ || !tx_manager_->isActive()) {
        return Error::internal("No transaction in progress");
    }
    tx_manager_->rollback();
    tx_manager_.reset();
    pool_.release(tx_connection_);
    tx_connection_ = nullptr;
    return Result<bool>(true);
}

}
}
}
