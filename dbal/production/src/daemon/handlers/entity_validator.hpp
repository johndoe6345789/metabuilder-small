/**
 * @file entity_validator.hpp
 * @brief JSON-schema-driven validation for entity create/update payloads.
 *
 * Constraints are read directly from EntityField — populated by loadSchemas()
 * from the entity JSON definitions (required, enum_values, min_length,
 * max_length, pattern).  No hard-coded rules.
 */
#pragma once

#include <regex>
#include <string>
#include <vector>
#include <nlohmann/json.hpp>
#include "dbal/adapters/adapter.hpp"

namespace dbal {
namespace daemon {
namespace handlers {

struct FieldError {
    std::string field;
    std::string message;
};

/**
 * Validate entity data against field constraints.
 *
 * @param schema    Entity schema (from getEntitySchema).
 * @param data      Payload being written (nlohmann::json object).
 * @param is_create true for POST (required fields enforced); false for PATCH/PUT.
 * @return Vector of errors, empty when valid.
 */
inline std::vector<FieldError> validateEntityData(
    const dbal::adapters::EntitySchema& schema,
    const nlohmann::json& data,
    bool is_create)
{
    std::vector<FieldError> errors;

    for (const auto& field : schema.fields) {
        // Primary keys are server-managed; skip
        if (field.unique && field.name == "id") continue;

        bool present = data.contains(field.name) && !data[field.name].is_null();

        // Required field check (CREATE only — PATCH may omit fields)
        if (field.required && is_create && !present) {
            errors.push_back({field.name, "Field is required"});
            continue;
        }

        if (!present) continue; // Optional / not supplied on update

        const auto& val = data[field.name];

        // Enum constraint
        if (!field.enumValues.empty() && val.is_string()) {
            const std::string s = val.get<std::string>();
            bool found = false;
            for (const auto& e : field.enumValues)
                if (s == e) { found = true; break; }
            if (!found) {
                std::string allowed;
                for (const auto& e : field.enumValues) {
                    if (!allowed.empty()) allowed += ", ";
                    allowed += "'" + e + "'";
                }
                errors.push_back({field.name, "Must be one of: " + allowed});
            }
        }

        // Length constraints (string / text fields)
        if (val.is_string()) {
            const std::string s = val.get<std::string>();
            const int len = static_cast<int>(s.size());
            if (field.minLength && len < *field.minLength)
                errors.push_back({field.name,
                    "Minimum length is " + std::to_string(*field.minLength)});
            if (field.maxLength && len > *field.maxLength)
                errors.push_back({field.name,
                    "Maximum length is " + std::to_string(*field.maxLength)});

            // Pattern constraint
            if (field.pattern && !field.pattern->empty()) {
                try {
                    std::regex re(*field.pattern);
                    if (!std::regex_search(s, re))
                        errors.push_back({field.name, "Does not match required pattern"});
                } catch (...) {}   // Silently ignore bad regex in schema
            }
        }

        // Numeric type check
        const bool is_numeric_type = (field.type == "number" || field.type == "bigint" ||
                                      field.type == "integer" || field.type == "int");
        if (is_numeric_type && !val.is_number() && !val.is_string()) {
            errors.push_back({field.name, "Expected a numeric value"});
        }

        // Boolean type check
        if (field.type == "boolean" && !val.is_boolean() && !val.is_number() && !val.is_string()) {
            errors.push_back({field.name, "Expected a boolean value"});
        }
    }

    return errors;
}

} // namespace handlers
} // namespace daemon
} // namespace dbal
