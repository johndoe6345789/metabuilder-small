#include "sqlite_type_converter.hpp"

namespace dbal {
namespace adapters {
namespace sqlite {

std::string SQLiteTypeConverter::jsonValueToString(const Json& value) {
    if (value.is_null()) {
        return "";
    } else if (value.is_boolean()) {
        return value.get<bool>() ? "1" : "0";
    } else if (value.is_number()) {
        return std::to_string(value.get<int64_t>());
    } else if (value.is_string()) {
        return value.get<std::string>();
    } else {
        return value.dump();
    }
}

std::vector<std::string> SQLiteTypeConverter::jsonToValues(const core::EntitySchema& schema,
                                                            const Json& data,
                                                            const std::string& prependId) {
    std::vector<std::string> values;

    if (!prependId.empty()) {
        values.push_back(prependId);
    }

    for (const auto& field : schema.fields) {
        // Only skip fields that are marked as generated AND not provided in data
        if (field.generated && !data.contains(field.name)) {
            continue;
        }
        if (data.contains(field.name)) {
            values.push_back(jsonValueToString(data[field.name]));
        }
    }

    return values;
}

std::vector<std::string> SQLiteTypeConverter::buildUpdateParams(const core::EntitySchema& schema,
                                                                 const Json& data,
                                                                 const std::string& id) {
    std::vector<std::string> values;

    // First add SET clause values
    for (const auto& field : schema.fields) {
        // Skip id field (can't update primary key) and skip createdAt (immutable)
        if (field.name == "id" || field.name == "createdAt") {
            continue;
        }
        if (data.contains(field.name)) {
            values.push_back(jsonValueToString(data[field.name]));
        }
    }

    // Then add WHERE clause value (id)
    values.push_back(id);

    return values;
}

std::vector<std::string> SQLiteTypeConverter::buildUpdateManyParams(const core::EntitySchema& schema,
                                                                     const Json& filter,
                                                                     const Json& data) {
    std::vector<std::string> values;

    // First add SET clause values
    for (const auto& field : schema.fields) {
        if (data.contains(field.name)) {
            values.push_back(jsonValueToString(data[field.name]));
        }
    }

    // Then add WHERE clause values
    for (const auto& [key, value] : filter.items()) {
        values.push_back(jsonValueToString(value));
    }

    return values;
}

std::vector<std::string> SQLiteTypeConverter::buildDeleteManyParams(const Json& filter) {
    std::vector<std::string> values;
    for (const auto& [key, value] : filter.items()) {
        values.push_back(jsonValueToString(value));
    }
    return values;
}

std::vector<std::string> SQLiteTypeConverter::buildFindParams(const Json& filter) {
    std::vector<std::string> values;
    for (const auto& [key, value] : filter.items()) {
        values.push_back(jsonValueToString(value));
    }
    return values;
}

std::vector<std::string> SQLiteTypeConverter::buildListParams(const ListOptions& options) {
    std::vector<std::string> values;

    // Add tenantId filter if present
    auto tenantFilter = options.filter.find("tenantId");
    if (tenantFilter != options.filter.end()) {
        values.push_back(tenantFilter->second);
    }

    // Add LIMIT and OFFSET
    const int limit = options.limit > 0 ? options.limit : 50;
    const int offset = options.page > 1 ? (options.page - 1) * limit : 0;

    values.push_back(std::to_string(limit));
    values.push_back(std::to_string(offset));

    return values;
}

} // namespace sqlite
} // namespace adapters
} // namespace dbal
