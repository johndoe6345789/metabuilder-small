#ifndef DBAL_SCHEMA_LOADER_HPP
#define DBAL_SCHEMA_LOADER_HPP

#include <string>
#include <vector>
#include <map>
#include <optional>
#include <algorithm>
#include <cctype>
#include <yaml-cpp/yaml.h>
#include <filesystem>
#include <spdlog/spdlog.h>

namespace dbal {
namespace adapters {

struct FieldDefinition {
    std::string name;
    std::string type;           // uuid, string, email, text, bigint, boolean, enum, etc.
    bool primary = false;
    bool required = false;
    bool unique = false;
    bool generated = false;
    bool optional = false;
    bool nullable = false;
    std::optional<std::string> default_value;
    std::optional<int> min_length;
    std::optional<int> max_length;
    std::optional<std::string> pattern;
    std::vector<std::string> enum_values;
};

struct IndexDefinition {
    std::vector<std::string> fields;
    bool unique = false;
};

struct EntityDefinition {
    std::string name;
    std::string version;
    std::string description;
    std::vector<FieldDefinition> fields;
    std::vector<IndexDefinition> indexes;
};

/**
 * Loads entity schemas from YAML files
 */
class SchemaLoader {
public:
    /**
     * Load entity definition from YAML file
     */
    static std::optional<EntityDefinition> loadFromFile(const std::string& file_path) {
        try {
            YAML::Node yaml = YAML::LoadFile(file_path);

            EntityDefinition entity;
            // Support both "entity:" and "name:" keys, with displayName for PascalCase
            if (yaml["entity"]) {
                entity.name = yaml["entity"].as<std::string>();
            } else if (yaml["displayName"]) {
                entity.name = yaml["displayName"].as<std::string>();
            } else if (yaml["name"]) {
                // Convert first letter to uppercase for table name
                std::string raw_name = yaml["name"].as<std::string>();
                if (!raw_name.empty()) {
                    raw_name[0] = static_cast<char>(std::toupper(static_cast<unsigned char>(raw_name[0])));
                }
                entity.name = raw_name;
            } else {
                return std::nullopt; // No entity name found
            }
            entity.version = yaml["version"] ? yaml["version"].as<std::string>() : "1.0";
            entity.description = yaml["description"] ? yaml["description"].as<std::string>() : "";

            // Load fields
            if (yaml["fields"]) {
                for (const auto& field_entry : yaml["fields"]) {
                    std::string field_name = field_entry.first.as<std::string>();
                    YAML::Node field_def = field_entry.second;

                    FieldDefinition field;
                    field.name = field_name;
                    std::string field_type = field_def["type"].as<std::string>();

                    // Normalize type to lowercase for consistent comparisons
                    std::transform(field_type.begin(), field_type.end(), field_type.begin(),
                                   [](unsigned char c) { return std::tolower(c); });

                    // Skip relationship fields - they don't map to columns
                    if (field_type == "relationship") {
                        continue;
                    }
                    // Map datetime to bigint for SQL compatibility
                    if (field_type == "datetime") {
                        field_type = "bigint";
                    }
                    // Map number to bigint for SQL
                    if (field_type == "number") {
                        field_type = "bigint";
                    }
                    // Map json to text for basic SQL (Postgres JSONB handled by template)
                    if (field_type == "json") {
                        field_type = "json";
                    }

                    field.type = field_type;
                    field.primary = (field_def["primary"] && field_def["primary"].as<bool>())
                                 || (field_def["primaryKey"] && field_def["primaryKey"].as<bool>());
                    field.required = field_def["required"] && field_def["required"].as<bool>();
                    field.unique = field_def["unique"] && field_def["unique"].as<bool>();
                    field.generated = field_def["generated"] && field_def["generated"].as<bool>();
                    field.optional = field_def["optional"] && field_def["optional"].as<bool>();
                    field.nullable = field_def["nullable"] && field_def["nullable"].as<bool>();

                    if (field_def["default"]) {
                        // Handle various default value types
                        const auto& def_node = field_def["default"];
                        if (def_node.IsScalar()) {
                            field.default_value = def_node.as<std::string>();
                        } else if (def_node.IsMap() || def_node.IsSequence()) {
                            // JSON-like defaults (e.g., default: {} or default: [])
                            // Store as empty string for SQL DEFAULT, actual value is in JSON
                            field.default_value = std::nullopt;
                        }
                    }
                    if (field_def["min_length"] || field_def["minLength"]) {
                        auto ml_node = field_def["min_length"] ? field_def["min_length"] : field_def["minLength"];
                        field.min_length = ml_node.as<int>();
                    }
                    if (field_def["max_length"] || field_def["maxLength"]) {
                        auto ml_node = field_def["max_length"] ? field_def["max_length"] : field_def["maxLength"];
                        field.max_length = ml_node.as<int>();
                    }
                    if (field_def["pattern"]) {
                        field.pattern = field_def["pattern"].as<std::string>();
                    }
                    if (field_def["values"]) {
                        for (const auto& val : field_def["values"]) {
                            field.enum_values.push_back(val.as<std::string>());
                        }
                    }

                    entity.fields.push_back(field);
                }
            }

            // Auto-add tenantId field if top-level tenantId: true is set
            if (yaml["tenantId"] && yaml["tenantId"].IsScalar()) {
                bool has_tenant = false;
                for (const auto& f : entity.fields) {
                    if (f.name == "tenantId") { has_tenant = true; break; }
                }
                if (!has_tenant) {
                    try {
                        bool tenant_flag = yaml["tenantId"].as<bool>();
                        if (tenant_flag) {
                            FieldDefinition tenant_field;
                            tenant_field.name = "tenantId";
                            tenant_field.type = "string";
                            tenant_field.required = false;
                            tenant_field.nullable = true;
                            entity.fields.push_back(tenant_field);
                        }
                    } catch (const YAML::BadConversion&) {
                        // tenantId might be a string value, not a bool flag - skip
                    }
                }
            }

            // Load indexes
            if (yaml["indexes"]) {
                for (const auto& index_node : yaml["indexes"]) {
                    IndexDefinition index;
                    if (index_node["fields"]) {
                        for (const auto& field : index_node["fields"]) {
                            index.fields.push_back(field.as<std::string>());
                        }
                    }
                    index.unique = index_node["unique"] && index_node["unique"].as<bool>();
                    entity.indexes.push_back(index);
                }
            }

            return entity;

        } catch (const YAML::Exception& e) {
            spdlog::warn("Failed to parse YAML {}: {}", file_path, e.what());
            return std::nullopt;
        } catch (const std::exception& e) {
            spdlog::warn("Failed to load entity from {}: {}", file_path, e.what());
            return std::nullopt;
        }
    }

    /**
     * Scan directory for entity YAML files
     */
    static std::vector<EntityDefinition> loadFromDirectory(const std::string& dir_path) {
        std::vector<EntityDefinition> entities;

        if (!std::filesystem::exists(dir_path)) {
            return entities;
        }

        // Recursively scan for .yaml files
        for (const auto& entry : std::filesystem::recursive_directory_iterator(dir_path)) {
            if (entry.is_regular_file() && entry.path().extension() == ".yaml") {
                auto entity = loadFromFile(entry.path().string());
                if (entity) {
                    entities.push_back(*entity);
                }
            }
        }

        return entities;
    }
};

} // namespace adapters
} // namespace dbal

#endif // DBAL_SCHEMA_LOADER_HPP
