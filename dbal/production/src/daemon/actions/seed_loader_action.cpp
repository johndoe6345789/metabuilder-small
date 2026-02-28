/**
 * @file seed_loader_action.cpp
 * @brief Seed data loader implementation
 */

#include "seed_loader_action.hpp"

#include <chrono>
#include <cstdlib>
#include <filesystem>
#include <fstream>
#include <sstream>
#include <yaml-cpp/yaml.h>
#include <spdlog/spdlog.h>

namespace fs = std::filesystem;

namespace dbal {
namespace daemon {
namespace actions {

std::string SeedLoaderAction::getDefaultSeedDir() {
    const char* env = std::getenv("DBAL_SEED_DIR");
    if (env) return env;

    // Check common relative paths
    std::vector<std::string> candidates = {
        "dbal/shared/seeds/database",
        "../shared/seeds/database",
        "/app/dbal/shared/seeds/database",   // Docker
        "/app/seeds/database",               // Docker alt
    };

    for (const auto& path : candidates) {
        if (fs::exists(path) && fs::is_directory(path)) {
            return path;
        }
    }

    return "dbal/shared/seeds/database";
}

std::vector<std::string> SeedLoaderAction::getSeedLoadOrder() {
    // Dependency order: parent entities first, then dependent entities
    return {
        "users.yaml",
        "credentials.yaml",
        "workspaces.yaml",
        "installed_packages.yaml",
        "projects.yaml",
        "workflows.yaml",
        "products.yaml",
        "games.yaml",
        "artists.yaml",
        "videos.yaml",
        "forum.yaml",
        "notifications.yaml",
        "audit_logs.yaml",
    };
}

nlohmann::json SeedLoaderAction::yamlToJson(const YAML::Node& node) {
    switch (node.Type()) {
        case YAML::NodeType::Null:
            return nullptr;
        case YAML::NodeType::Scalar: {
            // Try boolean
            try {
                if (node.Tag() == "!" || node.Scalar() == "true" || node.Scalar() == "false") {
                    return node.as<bool>();
                }
            } catch (...) {}
            // Try integer
            try {
                auto str = node.Scalar();
                // Only try int parsing for pure numeric strings
                if (!str.empty() && (str[0] == '-' || std::isdigit(static_cast<unsigned char>(str[0])))) {
                    // Check if it's a float (contains '.')
                    if (str.find('.') != std::string::npos) {
                        return node.as<double>();
                    }
                    // Try int64 first for timestamps
                    auto val = node.as<int64_t>();
                    return val;
                }
            } catch (...) {}
            // Default: string
            return node.as<std::string>();
        }
        case YAML::NodeType::Sequence: {
            auto arr = nlohmann::json::array();
            for (const auto& item : node) {
                arr.push_back(yamlToJson(item));
            }
            return arr;
        }
        case YAML::NodeType::Map: {
            auto obj = nlohmann::json::object();
            for (const auto& kv : node) {
                obj[kv.first.as<std::string>()] = yamlToJson(kv.second);
            }
            return obj;
        }
        default:
            return nullptr;
    }
}

void SeedLoaderAction::applyCurrentTimestamps(nlohmann::json& record, const std::string& timestamp_field) {
    if (timestamp_field.empty()) return;

    auto now_ms = std::chrono::duration_cast<std::chrono::milliseconds>(
        std::chrono::system_clock::now().time_since_epoch()
    ).count();

    // Replace the specified field if it's 0
    if (record.contains(timestamp_field) && record[timestamp_field].is_number() && record[timestamp_field] == 0) {
        record[timestamp_field] = now_ms;
    }

    // Also replace common timestamp fields if they're 0
    static const std::vector<std::string> common_ts_fields = {
        "createdAt", "updatedAt", "publishedAt", "installedAt", "timestamp", "lastSyncAt"
    };

    for (const auto& field : common_ts_fields) {
        if (record.contains(field) && record[field].is_number() && record[field] == 0) {
            record[field] = now_ms;
        }
    }
}

std::vector<SeedResult> SeedLoaderAction::loadSeedFile(Client& client, const std::string& file_path, bool force) {
    std::vector<SeedResult> results;

    try {
        // Load all YAML documents from file (supports --- separators)
        std::vector<YAML::Node> documents = YAML::LoadAllFromFile(file_path);

        for (const auto& doc : documents) {
            if (!doc.IsMap()) continue;

            SeedResult result;

            // Get entity name
            std::string entity_name;
            if (doc["entity"]) {
                entity_name = doc["entity"].as<std::string>();
            } else if (doc["displayName"]) {
                entity_name = doc["displayName"].as<std::string>();
            } else if (doc["name"]) {
                entity_name = doc["name"].as<std::string>();
            } else {
                continue;  // No entity name, skip document
            }
            result.entity = entity_name;

            // Check metadata flags
            bool skip_if_exists = false;
            bool use_current_timestamp = false;
            std::string timestamp_field;

            if (doc["metadata"]) {
                auto meta = doc["metadata"];
                if (meta["skipIfExists"]) {
                    skip_if_exists = meta["skipIfExists"].as<bool>();
                }
                if (meta["useCurrentTimestamp"]) {
                    use_current_timestamp = meta["useCurrentTimestamp"].as<bool>();
                }
                if (meta["timestampField"]) {
                    timestamp_field = meta["timestampField"].as<std::string>();
                }
            }

            // skipIfExists check: try to list existing records
            if (skip_if_exists && !force) {
                ListOptions opts;
                opts.limit = 1;
                auto existing = client.listEntities(entity_name, opts);
                if (existing.isOk() && !existing.value().items.empty()) {
                    spdlog::info("Seed: skipping {} (records already exist)", entity_name);
                    result.skipped = doc["records"] ? static_cast<int>(doc["records"].size()) : 0;
                    results.push_back(result);
                    continue;
                }
            }

            // Process records
            if (!doc["records"] || !doc["records"].IsSequence()) {
                spdlog::warn("Seed: no records array in {} document of {}", entity_name, file_path);
                results.push_back(result);
                continue;
            }

            for (const auto& record_node : doc["records"]) {
                try {
                    nlohmann::json record = yamlToJson(record_node);

                    // Apply current timestamps if configured
                    if (use_current_timestamp) {
                        applyCurrentTimestamps(record, timestamp_field);
                    }

                    // Insert via generic entity CRUD
                    auto create_result = client.createEntity(entity_name, record);

                    if (create_result.isOk()) {
                        result.inserted++;
                    } else {
                        result.failed++;
                        std::string id_str = record.contains("id") ? record["id"].dump() : "unknown";
                        std::string err = "Failed to create " + entity_name + " id=" + id_str +
                                          ": " + std::string(create_result.error().what());
                        result.errors.push_back(err);
                        spdlog::warn("Seed: {}", err);
                    }
                } catch (const std::exception& e) {
                    result.failed++;
                    result.errors.push_back(std::string("Exception processing record: ") + e.what());
                    spdlog::warn("Seed: exception in {}: {}", entity_name, e.what());
                }
            }

            spdlog::info("Seed: {} — inserted={}, skipped={}, failed={}",
                         entity_name, result.inserted, result.skipped, result.failed);
            results.push_back(result);
        }

    } catch (const YAML::Exception& e) {
        SeedResult err_result;
        err_result.entity = fs::path(file_path).filename().string();
        err_result.errors.push_back(std::string("YAML parse error: ") + e.what());
        err_result.failed = 1;
        results.push_back(err_result);
        spdlog::error("Seed: YAML error in {}: {}", file_path, e.what());
    } catch (const std::exception& e) {
        SeedResult err_result;
        err_result.entity = fs::path(file_path).filename().string();
        err_result.errors.push_back(std::string("Error: ") + e.what());
        err_result.failed = 1;
        results.push_back(err_result);
        spdlog::error("Seed: error loading {}: {}", file_path, e.what());
    }

    return results;
}

SeedSummary SeedLoaderAction::loadSeeds(Client& client, const std::string& seed_dir, bool force) {
    SeedSummary summary;

    if (!fs::exists(seed_dir)) {
        summary.success = false;
        summary.errors.push_back("Seed directory not found: " + seed_dir);
        spdlog::error("Seed: directory not found: {}", seed_dir);
        return summary;
    }

    spdlog::info("Seed: loading from {}{}", seed_dir, force ? " (force mode)" : "");

    // Get ordered file list
    auto load_order = getSeedLoadOrder();

    // Track which files we've loaded (to avoid duplicates)
    std::set<std::string> loaded_files;

    // Phase 1: Load files in dependency order
    for (const auto& filename : load_order) {
        fs::path file_path = fs::path(seed_dir) / filename;
        if (!fs::exists(file_path)) {
            spdlog::debug("Seed: skipping {} (not found)", filename);
            continue;
        }

        loaded_files.insert(filename);
        auto file_results = loadSeedFile(client, file_path.string(), force);
        for (auto& r : file_results) {
            summary.total_inserted += r.inserted;
            summary.total_skipped += r.skipped;
            summary.total_failed += r.failed;
            if (!r.errors.empty()) {
                summary.success = false;
                for (const auto& e : r.errors) {
                    summary.errors.push_back(e);
                }
            }
            summary.results.push_back(std::move(r));
        }
    }

    // Phase 2: Load any remaining YAML files not in the ordered list
    for (const auto& entry : fs::directory_iterator(seed_dir)) {
        if (!entry.is_regular_file()) continue;
        if (entry.path().extension() != ".yaml" && entry.path().extension() != ".yml") continue;

        std::string filename = entry.path().filename().string();
        if (loaded_files.count(filename)) continue;

        // Skip package_permissions and smtp_credentials (system-only)
        if (filename == "package_permissions.yaml" || filename == "smtp_credentials.yaml") continue;

        loaded_files.insert(filename);
        auto file_results = loadSeedFile(client, entry.path().string(), force);
        for (auto& r : file_results) {
            summary.total_inserted += r.inserted;
            summary.total_skipped += r.skipped;
            summary.total_failed += r.failed;
            if (!r.errors.empty()) {
                for (const auto& e : r.errors) {
                    summary.errors.push_back(e);
                }
            }
            summary.results.push_back(std::move(r));
        }
    }

    // Only mark as failed if there were actual errors (skips are OK)
    if (summary.total_failed > 0) {
        summary.success = false;
    } else {
        summary.success = true;
    }

    spdlog::info("Seed: complete — inserted={}, skipped={}, failed={}",
                 summary.total_inserted, summary.total_skipped, summary.total_failed);

    return summary;
}

} // namespace actions
} // namespace daemon
} // namespace dbal
