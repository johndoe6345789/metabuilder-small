#include "mongodb_collection_manager.hpp"
#include "../schema_loader.hpp"
#include <spdlog/spdlog.h>

namespace dbal {
namespace adapters {
namespace mongodb {

MongoDBCollectionManager::MongoDBCollectionManager(mongocxx::database& database,
                                                   const std::string& schema_path)
    : database_(database) {

    loadSchemas(schema_path);
    spdlog::info("MongoDBCollectionManager: Loaded {} entity schemas", schemas_.size());
}

void MongoDBCollectionManager::loadSchemas(const std::string& schema_path) {
    auto entities = SchemaLoader::loadFromDirectory(schema_path);

    for (const auto& entity_def : entities) {
        EntitySchema schema;
        schema.name = entity_def.name;
        schema.displayName = entity_def.description;
        for (const auto& field : entity_def.fields) {
            EntityField f;
            f.name = field.name;
            f.type = field.type;
            f.required = field.required;
            f.unique = field.unique;
            if (field.default_value.has_value()) {
                f.defaultValue = field.default_value.value();
            }
            schema.fields.push_back(f);
        }
        schemas_[entity_def.name] = schema;
    }
}

mongocxx::collection MongoDBCollectionManager::getCollection(const std::string& entityName) {
    return database_[entityName];
}

std::vector<std::string> MongoDBCollectionManager::getAvailableEntities() const {
    std::vector<std::string> entities;
    entities.reserve(schemas_.size());

    for (const auto& [name, schema] : schemas_) {
        entities.push_back(name);
    }

    return entities;
}

std::optional<EntitySchema> MongoDBCollectionManager::getEntitySchema(const std::string& entityName) const {
    auto it = schemas_.find(entityName);
    if (it == schemas_.end()) {
        return std::nullopt;
    }
    return it->second;
}

size_t MongoDBCollectionManager::getSchemaCount() const {
    return schemas_.size();
}

} // namespace mongodb
} // namespace adapters
} // namespace dbal
