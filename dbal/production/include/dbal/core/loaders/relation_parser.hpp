#ifndef DBAL_RELATION_PARSER_HPP
#define DBAL_RELATION_PARSER_HPP

#include <string>
#include <vector>
#include <yaml-cpp/yaml.h>
#include "dbal/core/entity_loader.hpp"

namespace dbal {
namespace core {

// Forward declarations
struct EntityIndex;

namespace loaders {

/**
 * @brief Parses relationship and index definitions from YAML
 *
 * Responsible for:
 * - Parsing index definitions (single and composite indexes)
 * - Parsing ACL (access control list) configurations
 * - Future: Parse relationship definitions (belongs-to, has-many, etc.)
 */
class RelationParser {
public:
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

private:
    /**
     * @brief Parse index fields from YAML array
     * @param indexNode YAML node
     * @return Vector of field names
     */
    std::vector<std::string> parseIndexFields(const YAML::Node& indexNode);

    /**
     * @brief Parse ACL permissions for a specific operation
     * @param operationNode YAML node containing role permissions
     * @return Map of role name to permission boolean
     */
    std::map<std::string, bool> parseACLOperation(const YAML::Node& operationNode);
};

}  // namespace loaders
}  // namespace core
}  // namespace dbal

#endif  // DBAL_RELATION_PARSER_HPP
