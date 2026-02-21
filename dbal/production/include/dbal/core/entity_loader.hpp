#ifndef DBAL_ENTITY_LOADER_HPP
#define DBAL_ENTITY_LOADER_HPP

#include <map>
#include <string>
#include <vector>
#include <optional>
#include <yaml-cpp/yaml.h>
#include "relation_def.hpp"

namespace dbal {
namespace core {

/**
 * @brief Represents a single field in an entity schema
 */
struct EntityField {
    std::string name;
    std::string type;         // "string", "number", "boolean", "timestamp", "json", "uuid", "email", "text", "bigint", "enum", "cuid"
    bool required = false;
    bool unique = false;
    bool primary = false;
    bool generated = false;
    bool nullable = false;
    bool index = false;       // Quick single-field index
    std::optional<std::string> defaultValue;
    std::optional<std::string> references;  // Foreign key reference to another entity
    std::optional<int> minLength;
    std::optional<int> maxLength;
    std::optional<std::string> pattern;
    std::optional<std::vector<std::string>> enumValues;  // For enum type
    std::optional<std::string> description;
};

/**
 * @brief Represents a database index on entity fields
 */
struct EntityIndex {
    std::vector<std::string> fields;
    bool unique = false;
    std::optional<std::string> name;  // Optional index name
};

/**
 * @brief Complete schema definition for a database entity
 */
struct EntitySchema {
    std::string name;
    std::string displayName;
    std::string description;
    std::string version;
    std::vector<EntityField> fields;
    std::vector<EntityIndex> indexes;
    std::vector<RelationDef> relations;
    std::map<std::string, std::string> metadata;

    // ACL (Access Control List) configuration
    struct ACL {
        std::map<std::string, bool> create;
        std::map<std::string, bool> read;
        std::map<std::string, bool> update;
        std::map<std::string, bool> del;  // 'delete' is a reserved keyword
    };
    std::optional<ACL> acl;
};

/**
 * @brief Loads entity schemas from YAML files
 *
 * Dynamically discovers and parses entity schemas from YAML files in a directory structure.
 * This replaces hardcoded entity definitions with declarative schema-based loading.
 *
 * Usage:
 *   EntitySchemaLoader loader;
 *   auto schemas = loader.loadSchemas("dbal/shared/api/schema/entities/");
 *   EntitySchema userSchema = schemas["user"];
 */
class EntitySchemaLoader {
public:
    /**
     * @brief Load all YAML schemas from directory recursively
     * @param schemaPath Root directory containing entity YAML files
     * @return Map of entity name to schema definition
     */
    std::map<std::string, EntitySchema> loadSchemas(const std::string& schemaPath);

    /**
     * @brief Load single YAML file and parse entity schema
     * @param filePath Path to YAML file
     * @return Parsed entity schema
     * @throws std::runtime_error if file cannot be loaded or parsed
     */
    EntitySchema loadSchema(const std::string& filePath);

    /**
     * @brief Get default schema path (tries multiple common locations)
     * @return Path to schema directory
     * @throws std::runtime_error if no valid path found
     */
    static std::string getDefaultSchemaPath();

private:
    /**
     * @brief Recursively find all YAML files in directory
     * @param dir Directory to search
     * @return List of YAML file paths
     */
    std::vector<std::string> findYamlFiles(const std::string& dir);

    /**
     * @brief Parse YAML node into EntitySchema struct
     * @param node YAML node containing entity definition
     * @return Parsed entity schema
     */
    EntitySchema parseYaml(const YAML::Node& node);

    /**
     * @brief Parse field definition from YAML
     * @param fieldName Name of the field
     * @param fieldNode YAML node containing field definition
     * @return Parsed entity field
     */
    EntityField parseField(const std::string& fieldName, const YAML::Node& fieldNode);

    /**
     * @brief Parse index definition from YAML
     * @param indexNode YAML node containing index definition
     * @return Parsed entity index
     */
    EntityIndex parseIndex(const YAML::Node& indexNode);

    /**
     * @brief Parse ACL (access control list) from YAML
     * @param aclNode YAML node containing ACL definition
     * @return Parsed ACL configuration
     */
    EntitySchema::ACL parseACL(const YAML::Node& aclNode);
};

}  // namespace core
}  // namespace dbal

#endif  // DBAL_ENTITY_LOADER_HPP
