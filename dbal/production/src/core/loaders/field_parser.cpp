#include "dbal/core/loaders/field_parser.hpp"
#include "dbal/core/entity_loader.hpp"

namespace dbal {
namespace core {
namespace loaders {

EntityField FieldParser::parseField(const std::string& fieldName, const YAML::Node& fieldNode) {
    EntityField field;
    field.name = fieldName;

    // Parse field type
    field.type = parseType(fieldNode);

    // Parse boolean flags
    parseFlags(fieldNode, field);

    // Parse optional properties
    parseOptionalProperties(fieldNode, field);

    // Parse validation constraints
    parseValidation(fieldNode, field);

    // Parse enum values if type is enum
    if (field.type == "enum" && fieldNode["values"]) {
        field.enumValues = parseEnumValues(fieldNode);
    }

    return field;
}

std::string FieldParser::parseType(const YAML::Node& fieldNode) {
    return fieldNode["type"].as<std::string>("string");
}

void FieldParser::parseFlags(const YAML::Node& fieldNode, EntityField& field) {
    field.required = fieldNode["required"].as<bool>(false);
    field.unique = fieldNode["unique"].as<bool>(false);
    field.primary = fieldNode["primary"].as<bool>(false);
    field.generated = fieldNode["generated"].as<bool>(false);
    field.nullable = fieldNode["nullable"].as<bool>(false);
    field.index = fieldNode["index"].as<bool>(false);
}

void FieldParser::parseOptionalProperties(const YAML::Node& fieldNode, EntityField& field) {
    if (fieldNode["default"]) {
        field.defaultValue = fieldNode["default"].as<std::string>();
    }

    if (fieldNode["references"]) {
        field.references = fieldNode["references"].as<std::string>();
    }

    if (fieldNode["description"]) {
        field.description = fieldNode["description"].as<std::string>();
    }
}

void FieldParser::parseValidation(const YAML::Node& fieldNode, EntityField& field) {
    // Support both snake_case and camelCase for length constraints
    if (fieldNode["min_length"]) {
        field.minLength = fieldNode["min_length"].as<int>();
    } else if (fieldNode["minLength"]) {
        field.minLength = fieldNode["minLength"].as<int>();
    }

    if (fieldNode["max_length"]) {
        field.maxLength = fieldNode["max_length"].as<int>();
    } else if (fieldNode["maxLength"]) {
        field.maxLength = fieldNode["maxLength"].as<int>();
    }

    if (fieldNode["pattern"]) {
        field.pattern = fieldNode["pattern"].as<std::string>();
    }
}

std::vector<std::string> FieldParser::parseEnumValues(const YAML::Node& fieldNode) {
    std::vector<std::string> enumValues;
    for (const auto& value : fieldNode["values"]) {
        enumValues.push_back(value.as<std::string>());
    }
    return enumValues;
}

}  // namespace loaders
}  // namespace core
}  // namespace dbal
