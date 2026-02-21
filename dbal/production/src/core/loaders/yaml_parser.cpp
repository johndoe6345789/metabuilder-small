#include "dbal/core/loaders/yaml_parser.hpp"
#include <filesystem>
#include <fstream>
#include <spdlog/spdlog.h>

namespace fs = std::filesystem;

namespace dbal {
namespace core {
namespace loaders {

YAML::Node YamlParser::loadFile(const std::string& filePath) {
    if (!fs::exists(filePath)) {
        throw std::runtime_error("YAML file does not exist: " + filePath);
    }

    try {
        return YAML::LoadFile(filePath);
    } catch (const YAML::Exception& e) {
        throw std::runtime_error("Failed to parse YAML file " + filePath + ": " + e.what());
    }
}

std::vector<std::string> YamlParser::findYamlFiles(const std::string& dir) {
    std::vector<std::string> files;

    if (!fs::exists(dir) || !fs::is_directory(dir)) {
        return files;
    }

    try {
        for (const auto& entry : fs::recursive_directory_iterator(dir)) {
            if (entry.is_regular_file()) {
                const auto& path = entry.path();
                const auto ext = path.extension().string();
                const auto filename = path.filename().string();

                // Skip the root entities.yaml file (metadata only)
                if (filename == "entities.yaml" || filename == "entities.yml") {
                    continue;
                }

                // Include .yaml and .yml files
                if (ext == ".yaml" || ext == ".yml") {
                    files.push_back(path.string());
                }
            }
        }
    } catch (const fs::filesystem_error& e) {
        spdlog::error("Error scanning directory {}: {}", dir, e.what());
    }

    return files;
}

bool YamlParser::fileExists(const std::string& filePath) {
    return fs::exists(filePath) && fs::is_regular_file(filePath);
}

}  // namespace loaders
}  // namespace core
}  // namespace dbal
