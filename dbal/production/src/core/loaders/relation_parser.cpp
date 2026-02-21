#include "dbal/core/loaders/relation_parser.hpp"
#include "dbal/core/entity_loader.hpp"

namespace dbal {
namespace core {
namespace loaders {

EntityIndex RelationParser::parseIndex(const YAML::Node& indexNode) {
    EntityIndex index;

    // Parse index fields
    index.fields = parseIndexFields(indexNode);

    // Parse unique flag
    index.unique = indexNode["unique"].as<bool>(false);

    // Parse optional index name
    if (indexNode["name"]) {
        index.name = indexNode["name"].as<std::string>();
    }

    return index;
}

EntitySchema::ACL RelationParser::parseACL(const YAML::Node& aclNode) {
    EntitySchema::ACL acl;

    // Parse ACL permissions for each operation
    if (aclNode["create"]) {
        acl.create = parseACLOperation(aclNode["create"]);
    }

    if (aclNode["read"]) {
        acl.read = parseACLOperation(aclNode["read"]);
    }

    if (aclNode["update"]) {
        acl.update = parseACLOperation(aclNode["update"]);
    }

    if (aclNode["delete"]) {
        acl.del = parseACLOperation(aclNode["delete"]);
    }

    return acl;
}

std::vector<std::string> RelationParser::parseIndexFields(const YAML::Node& indexNode) {
    std::vector<std::string> fields;

    if (indexNode["fields"]) {
        for (const auto& fieldName : indexNode["fields"]) {
            fields.push_back(fieldName.as<std::string>());
        }
    }

    return fields;
}

std::map<std::string, bool> RelationParser::parseACLOperation(const YAML::Node& operationNode) {
    std::map<std::string, bool> permissions;

    for (auto it = operationNode.begin(); it != operationNode.end(); ++it) {
        permissions[it->first.as<std::string>()] = it->second.as<bool>();
    }

    return permissions;
}

}  // namespace loaders
}  // namespace core
}  // namespace dbal
