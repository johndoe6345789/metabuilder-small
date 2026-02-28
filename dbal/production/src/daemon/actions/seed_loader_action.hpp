/**
 * @file seed_loader_action.hpp
 * @brief Loads seed data from YAML files into the database via generic entity CRUD
 *
 * Reads YAML seed files from DBAL_SEED_DIR (default: dbal/shared/seeds/database/)
 * and inserts records using Client::createEntity(). Supports:
 *   - Multi-document YAML (--- separators for multiple entities per file)
 *   - skipIfExists: checks record count before seeding
 *   - useCurrentTimestamp: replaces 0-valued timestamp fields with current time
 *   - Dependency ordering via explicit load order
 */

#pragma once

#include <string>
#include <vector>
#include <functional>
#include <nlohmann/json.hpp>
#include <yaml-cpp/yaml.h>
#include "dbal/core/client.hpp"

namespace dbal {
namespace daemon {
namespace actions {

struct SeedResult {
    std::string entity;
    int inserted = 0;
    int skipped = 0;
    int failed = 0;
    std::vector<std::string> errors;
};

struct SeedSummary {
    bool success = true;
    int total_inserted = 0;
    int total_skipped = 0;
    int total_failed = 0;
    std::vector<SeedResult> results;
    std::vector<std::string> errors;
};

class SeedLoaderAction {
public:
    /**
     * Load all seed files from directory and insert records into database.
     * @param client    DBAL client for database operations
     * @param seed_dir  Path to seed data directory
     * @param force     If true, skip the "skipIfExists" check and always insert
     * @return Summary of seed operations
     */
    static SeedSummary loadSeeds(Client& client, const std::string& seed_dir, bool force = false);

    /**
     * Load a single seed YAML file.
     * May return multiple SeedResults if file contains multi-document YAML.
     */
    static std::vector<SeedResult> loadSeedFile(Client& client, const std::string& file_path, bool force = false);

    /**
     * Get default seed directory from DBAL_SEED_DIR env or fallback
     */
    static std::string getDefaultSeedDir();

private:
    /**
     * Convert YAML node to nlohmann::json recursively
     */
    static nlohmann::json yamlToJson(const YAML::Node& node);

    /**
     * Replace timestamp fields with value 0 with current time (milliseconds)
     */
    static void applyCurrentTimestamps(nlohmann::json& record, const std::string& timestamp_field);

    /**
     * Ordered list of seed files to load (dependency order)
     */
    static std::vector<std::string> getSeedLoadOrder();
};

} // namespace actions
} // namespace daemon
} // namespace dbal
