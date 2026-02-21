#include "sqlite_query_builder.hpp"
#include <algorithm>
#include <cctype>
#include <sstream>

namespace dbal {
namespace adapters {
namespace sqlite {

std::string SQLiteQueryBuilder::buildInsertQuery(const core::EntitySchema& schema, const Json& data) {
    const std::string tableName = quoteId(schema.name);
    std::vector<std::string> fields;
    std::vector<std::string> placeholders;

    for (const auto& field : schema.fields) {
        // Only skip truly auto-generated fields (generated flag set)
        if (field.generated && !data.contains(field.name)) {
            continue;
        }
        if (data.contains(field.name)) {
            fields.push_back(quoteId(field.name));
            placeholders.push_back("?");
        }
    }

    std::string sql = "INSERT INTO " + tableName + " (" + joinFragments(fields, ", ") + ") " +
                     "VALUES (" + joinFragments(placeholders, ", ") + ")";
    return sql;
}

std::string SQLiteQueryBuilder::buildSelectQuery(const core::EntitySchema& schema, const Json& filter) {
    const std::string tableName = quoteId(schema.name);
    const std::string fieldList = buildFieldList(schema);
    std::string sql = "SELECT " + fieldList + " FROM " + tableName;

    if (!filter.empty()) {
        sql += " WHERE " + buildWhereClause(filter);
    }

    return sql;
}

std::string SQLiteQueryBuilder::buildUpdateQuery(const core::EntitySchema& schema,
                                                 const std::string& id,
                                                 const Json& data) {
    const std::string tableName = quoteId(schema.name);
    std::vector<std::string> setFragments;

    for (const auto& field : schema.fields) {
        if (field.name == "id" || field.name == "createdAt") {
            continue; // Skip immutable fields
        }
        if (data.contains(field.name)) {
            setFragments.push_back(quoteId(field.name) + " = ?");
        }
    }

    if (setFragments.empty()) {
        return "";
    }

    std::string sql = "UPDATE " + tableName + " SET " + joinFragments(setFragments, ", ") +
                     " WHERE \"id\" = ?";
    return sql;
}

std::string SQLiteQueryBuilder::buildDeleteQuery(const core::EntitySchema& schema, const std::string& id) {
    const std::string tableName = quoteId(schema.name);
    return "DELETE FROM " + tableName + " WHERE \"id\" = ?";
}

std::string SQLiteQueryBuilder::buildListQuery(const core::EntitySchema& schema,
                                              const ListOptions& options) {
    const std::string tableName = quoteId(schema.name);
    const std::string fieldList = buildFieldList(schema);
    std::string sql = "SELECT " + fieldList + " FROM " + tableName;

    // Build WHERE clause from all filters
    if (!options.filter.empty()) {
        std::vector<std::string> whereFragments;
        for (const auto& [key, _] : options.filter) {
            whereFragments.push_back(quoteId(key) + " = ?");
        }
        sql += " WHERE " + joinFragments(whereFragments, " AND ");
    }

    // Add ORDER BY if sort is specified, otherwise use a sensible default
    if (!options.sort.empty()) {
        std::vector<std::string> orderFragments;
        for (const auto& [field, dir] : options.sort) {
            std::string direction = (dir == "asc" || dir == "ASC") ? "ASC" : "DESC";
            orderFragments.push_back(quoteId(field) + " " + direction);
        }
        sql += " ORDER BY " + joinFragments(orderFragments, ", ");
    }

    sql += " LIMIT ? OFFSET ?";

    return sql;
}

std::string SQLiteQueryBuilder::buildUpdateManyQuery(const core::EntitySchema& schema,
                                                     const Json& filter,
                                                     const Json& data) {
    const std::string tableName = quoteId(schema.name);
    std::string sql = "UPDATE " + tableName + " SET ";

    // Build SET clause
    std::vector<std::string> setFragments;
    for (const auto& field : schema.fields) {
        if (data.contains(field.name)) {
            setFragments.push_back(quoteId(field.name) + " = ?");
        }
    }

    if (setFragments.empty()) {
        return "";
    }

    sql += joinFragments(setFragments, ", ");

    // Build WHERE clause
    if (!filter.empty()) {
        sql += " WHERE " + buildWhereClause(filter);
    }

    return sql;
}

std::string SQLiteQueryBuilder::buildDeleteManyQuery(const core::EntitySchema& schema,
                                                     const Json& filter) {
    const std::string tableName = quoteId(schema.name);
    std::string sql = "DELETE FROM " + tableName;

    if (!filter.empty()) {
        sql += " WHERE " + buildWhereClause(filter);
    }

    return sql;
}

std::string SQLiteQueryBuilder::buildFindFirstQuery(const core::EntitySchema& schema,
                                                    const Json& filter) {
    const std::string tableName = quoteId(schema.name);
    const std::string fieldList = buildFieldList(schema);
    std::string sql = "SELECT " + fieldList + " FROM " + tableName;

    if (!filter.empty()) {
        sql += " WHERE " + buildWhereClause(filter);
    }

    sql += " LIMIT 1";

    return sql;
}

std::string SQLiteQueryBuilder::buildFieldList(const core::EntitySchema& schema) {
    std::vector<std::string> fields;
    for (const auto& field : schema.fields) {
        fields.push_back(quoteId(field.name));
    }
    return joinFragments(fields, ", ");
}

std::string SQLiteQueryBuilder::buildWhereClause(const Json& filter) {
    std::vector<std::string> whereFragments;
    for (const auto& [key, _] : filter.items()) {
        whereFragments.push_back(quoteId(key) + " = ?");
    }
    return joinFragments(whereFragments, " AND ");
}

std::string SQLiteQueryBuilder::quoteId(const std::string& identifier) {
    return "\"" + identifier + "\"";
}

std::string SQLiteQueryBuilder::toLowerSnakeCase(const std::string& pascalCase) {
    std::string result;
    for (size_t i = 0; i < pascalCase.size(); ++i) {
        const char c = pascalCase[i];
        if (i > 0 && std::isupper(static_cast<unsigned char>(c))) {
            result += '_';
        }
        result += static_cast<char>(std::tolower(static_cast<unsigned char>(c)));
    }
    return result;
}

std::string SQLiteQueryBuilder::joinFragments(const std::vector<std::string>& fragments,
                                              const std::string& separator) {
    std::ostringstream out;
    for (size_t i = 0; i < fragments.size(); ++i) {
        if (i > 0) {
            out << separator;
        }
        out << fragments[i];
    }
    return out.str();
}

} // namespace sqlite
} // namespace adapters
} // namespace dbal
