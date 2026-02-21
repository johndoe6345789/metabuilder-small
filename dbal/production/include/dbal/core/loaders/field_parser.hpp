#ifndef DBAL_FIELD_PARSER_HPP
#define DBAL_FIELD_PARSER_HPP

#include <string>
#include <vector>
#include <optional>
#include <yaml-cpp/yaml.h>

namespace dbal {
namespace core {

// Forward declaration
struct EntityField;

namespace loaders {

/**
 * @brief Parses field definitions from YAML
 *
 * Responsible for:
 * - Parsing field types and constraints
 * - Extracting validation rules (min/max length, pattern, enum values)
 * - Handling optional field properties (default values, references)
 */
class FieldParser {
public:
    /**
     * @brief Parse a single field definition from YAML
     * @param fieldName Name of the field
     * @param fieldNode YAML node containing field definition
     * @return Parsed entity field with all properties
     */
    EntityField parseField(const std::string& fieldName, const YAML::Node& fieldNode);

private:
    /**
     * @brief Parse field type (string, number, boolean, etc.)
     * @param fieldNode YAML node
     * @return Field type string
     */
    std::string parseType(const YAML::Node& fieldNode);

    /**
     * @brief Parse boolean flags (required, unique, primary, etc.)
     * @param fieldNode YAML node
     * @param field Field to populate with flags
     */
    void parseFlags(const YAML::Node& fieldNode, EntityField& field);

    /**
     * @brief Parse optional field properties (default, references, etc.)
     * @param fieldNode YAML node
     * @param field Field to populate with optional properties
     */
    void parseOptionalProperties(const YAML::Node& fieldNode, EntityField& field);

    /**
     * @brief Parse validation constraints (min/max length, pattern)
     * @param fieldNode YAML node
     * @param field Field to populate with constraints
     */
    void parseValidation(const YAML::Node& fieldNode, EntityField& field);

    /**
     * @brief Parse enum values for enum type fields
     * @param fieldNode YAML node
     * @return Vector of enum values
     */
    std::vector<std::string> parseEnumValues(const YAML::Node& fieldNode);
};

}  // namespace loaders
}  // namespace core
}  // namespace dbal

#endif  // DBAL_FIELD_PARSER_HPP
