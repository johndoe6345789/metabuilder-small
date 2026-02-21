#ifndef DBAL_YAML_PARSER_HPP
#define DBAL_YAML_PARSER_HPP

#include <string>
#include <vector>
#include <yaml-cpp/yaml.h>

namespace dbal {
namespace core {
namespace loaders {

/**
 * @brief Handles YAML file parsing and discovery
 *
 * Responsible for:
 * - Finding YAML files recursively in directories
 * - Loading YAML files into YAML::Node objects
 * - Basic YAML syntax validation
 */
class YamlParser {
public:
    /**
     * @brief Load YAML file into node object
     * @param filePath Path to YAML file
     * @return Parsed YAML node
     * @throws std::runtime_error if file cannot be loaded or parsed
     */
    YAML::Node loadFile(const std::string& filePath);

    /**
     * @brief Recursively find all YAML files in directory
     * @param dir Directory to search
     * @return List of YAML file paths (excludes entities.yaml metadata files)
     */
    std::vector<std::string> findYamlFiles(const std::string& dir);

    /**
     * @brief Check if file exists and is readable
     * @param filePath Path to check
     * @return true if file exists and can be read
     */
    bool fileExists(const std::string& filePath);
};

}  // namespace loaders
}  // namespace core
}  // namespace dbal

#endif  // DBAL_YAML_PARSER_HPP
