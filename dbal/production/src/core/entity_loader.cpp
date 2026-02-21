#include "dbal/core/entity_loader.hpp"
#include "dbal/core/loaders/yaml_parser.hpp"
#include "dbal/core/loaders/field_parser.hpp"
#include "dbal/core/loaders/relation_parser.hpp"
#include "dbal/core/loaders/schema_validator.hpp"
#include "dbal/core/loaders/schema_cache.hpp"
#include <filesystem>
#include <spdlog/spdlog.h>

namespace fs = std::filesystem;

namespace dbal {
namespace core {

// Static cache instance
static loaders::SchemaCache schemaCache;

std::string EntitySchemaLoader::getDefaultSchemaPath() {
    // Try multiple possible locations relative to different working directories
    std::vector<std::string> possibilities = {
        "dbal/shared/api/schema/entities",
        "../dbal/shared/api/schema/entities",
        "../../dbal/shared/api/schema/entities",
        "../../../dbal/shared/api/schema/entities"
    };

    for (const auto& path : possibilities) {
        if (fs::exists(path) && fs::is_directory(path)) {
            return path;
        }
    }

    throw std::runtime_error("Could not find DBAL schema directory. Tried paths: " +
                           possibilities[0] + ", " + possibilities[1] + ", etc.");
}

std::map<std::string, EntitySchema> EntitySchemaLoader::loadSchemas(const std::string& schemaPath) {
    std::map<std::string, EntitySchema> schemas;

    if (!fs::exists(schemaPath) || !fs::is_directory(schemaPath)) {
        spdlog::error("Schema path does not exist or is not a directory: {}", schemaPath);
        return schemas;
    }

    // Initialize loaders
    loaders::YamlParser yamlParser;
    auto yamlFiles = yamlParser.findYamlFiles(schemaPath);
    spdlog::info("Found {} YAML schema files in {}", yamlFiles.size(), schemaPath);

    // Load each schema file
    for (const auto& file : yamlFiles) {
        try {
            auto schema = loadSchema(file);
            if (!schema.name.empty()) {
                schemas[schema.name] = schema;
                schemaCache.put(schema.name, schema);
                spdlog::debug("Loaded entity schema: {} ({})", schema.name, schema.displayName);
            } else {
                spdlog::warn("Schema file has no name field: {}", file);
            }
        } catch (const std::exception& e) {
            // Log error but continue loading other schemas
            spdlog::error("Failed to load schema from {}: {}", file, e.what());
        }
    }

    spdlog::info("Successfully loaded {} entity schemas", schemas.size());
    return schemas;
}

EntitySchema EntitySchemaLoader::loadSchema(const std::string& filePath) {
    if (!fs::exists(filePath)) {
        throw std::runtime_error("Schema file does not exist: " + filePath);
    }

    // Load and parse YAML
    loaders::YamlParser yamlParser;
    YAML::Node node = yamlParser.loadFile(filePath);
    EntitySchema schema = parseYaml(node);

    // Validate schema
    loaders::SchemaValidator validator;
    auto validationResult = validator.validate(schema);

    if (!validationResult.isValid()) {
        std::string errorMsg = "Schema validation failed for " + filePath + ":\n";
        for (const auto& error : validationResult.errors) {
            errorMsg += "  ERROR: " + error + "\n";
        }
        throw std::runtime_error(errorMsg);
    }

    // Log warnings
    for (const auto& warning : validationResult.warnings) {
        spdlog::warn("Schema {}: {}", filePath, warning);
    }

    return schema;
}

std::vector<std::string> EntitySchemaLoader::findYamlFiles(const std::string& dir) {
    loaders::YamlParser yamlParser;
    return yamlParser.findYamlFiles(dir);
}

EntitySchema EntitySchemaLoader::parseYaml(const YAML::Node& node) {
    EntitySchema schema;

    // Parse basic metadata
    // YAML uses "entity" for the name field
    if (node["entity"]) {
        schema.name = node["entity"].as<std::string>("");
    } else if (node["name"]) {
        schema.name = node["name"].as<std::string>("");
    }

    schema.displayName = node["displayName"].as<std::string>(schema.name);
    schema.description = node["description"].as<std::string>("");
    schema.version = node["version"].as<std::string>("1.0");

    // Parse fields using FieldParser
    loaders::FieldParser fieldParser;
    if (node["fields"]) {
        const auto& fieldsNode = node["fields"];
        for (auto it = fieldsNode.begin(); it != fieldsNode.end(); ++it) {
            std::string fieldName = it->first.as<std::string>();
            EntityField field = fieldParser.parseField(fieldName, it->second);
            schema.fields.push_back(field);
        }
    }

    // Parse indexes and ACL using RelationParser
    loaders::RelationParser relationParser;
    if (node["indexes"]) {
        for (const auto& indexNode : node["indexes"]) {
            EntityIndex index = relationParser.parseIndex(indexNode);
            schema.indexes.push_back(index);
        }
    }

    if (node["acl"]) {
        schema.acl = relationParser.parseACL(node["acl"]);
    }

    // Parse additional metadata
    if (node["metadata"]) {
        for (auto it = node["metadata"].begin(); it != node["metadata"].end(); ++it) {
            schema.metadata[it->first.as<std::string>()] = it->second.as<std::string>();
        }
    }

    return schema;
}

EntityField EntitySchemaLoader::parseField(const std::string& fieldName, const YAML::Node& fieldNode) {
    loaders::FieldParser fieldParser;
    return fieldParser.parseField(fieldName, fieldNode);
}

EntityIndex EntitySchemaLoader::parseIndex(const YAML::Node& indexNode) {
    loaders::RelationParser relationParser;
    return relationParser.parseIndex(indexNode);
}

EntitySchema::ACL EntitySchemaLoader::parseACL(const YAML::Node& aclNode) {
    loaders::RelationParser relationParser;
    return relationParser.parseACL(aclNode);
}

}  // namespace core
}  // namespace dbal
