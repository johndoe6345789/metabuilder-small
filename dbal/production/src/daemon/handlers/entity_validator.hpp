#pragma once

#include <string>
#include <vector>
#include <nlohmann/json.hpp>
#include "dbal/adapters/adapter.hpp"

namespace dbal {
namespace daemon {
namespace handlers {

struct ValidationError {
    std::string field;
    std::string message;
};

/**
 * Validate entity data against its schema.
 * @param schema  The entity schema with field definitions
 * @param data    The JSON payload to validate
 * @param isCreate  True for POST (all required fields must be present)
 * @return Vector of validation errors (empty = valid)
 */
inline std::vector<ValidationError> validateEntityData(
    const adapters::EntitySchema& schema,
    const nlohmann::json& data,
    bool isCreate
) {
    std::vector<ValidationError> errors;

    for (const auto& field : schema.fields) {
        bool present = data.contains(field.name) && !data[field.name].is_null();

        // Required check only on create
        if (isCreate && field.required && !present) {
            errors.push_back({field.name, "Field is required"});
            continue;
        }

        if (!present) continue;

        // Type checks for string fields
        if (field.type == "string" || field.type == "email" || field.type == "text" ||
            field.type == "uuid" || field.type == "cuid" || field.type == "enum") {
            if (!data[field.name].is_string()) {
                errors.push_back({field.name, "Expected string value"});
                continue;
            }
            const auto& val = data[field.name].get_ref<const std::string&>();

            if (field.minLength.has_value() && static_cast<int>(val.size()) < *field.minLength) {
                errors.push_back({field.name, "Value too short (min " + std::to_string(*field.minLength) + ")"});
            }
            if (field.maxLength.has_value() && static_cast<int>(val.size()) > *field.maxLength) {
                errors.push_back({field.name, "Value too long (max " + std::to_string(*field.maxLength) + ")"});
            }
            if (field.enumValues.has_value()) {
                const auto& allowed = *field.enumValues;
                if (std::find(allowed.begin(), allowed.end(), val) == allowed.end()) {
                    errors.push_back({field.name, "Invalid enum value"});
                }
            }
        }

        // Type checks for numeric fields
        if (field.type == "number" || field.type == "bigint") {
            if (!data[field.name].is_number()) {
                errors.push_back({field.name, "Expected numeric value"});
            }
        }

        // Type checks for boolean fields
        if (field.type == "boolean") {
            if (!data[field.name].is_boolean()) {
                errors.push_back({field.name, "Expected boolean value"});
            }
        }
    }

    return errors;
}

} // namespace handlers
} // namespace daemon
} // namespace dbal
