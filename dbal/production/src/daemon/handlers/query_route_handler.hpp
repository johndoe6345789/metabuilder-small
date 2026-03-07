#pragma once

#include <drogon/HttpRequest.h>
#include <drogon/HttpResponse.h>
#include <json/json.h>
#include <functional>
#include <string>
#include <unordered_map>
#include <filesystem>
#include <fstream>
#include <nlohmann/json.hpp>
#include <spdlog/spdlog.h>
#include "dbal/core/client.hpp"
#include "../json_convert.hpp"

namespace dbal {
namespace daemon {
namespace handlers {

/**
 * @class QueryRouteHandler
 * @brief Handles stored query/procedure execution from JSON definitions
 *
 * Loads query definitions from DBAL_QUERIES_DIR (JSON files) and executes
 * them via the DBAL client when requested via the REST API.
 */
class QueryRouteHandler {
public:
    explicit QueryRouteHandler(dbal::Client& client) : client_(client) {}

    /**
     * Load stored procedure definitions from a directory of JSON files.
     */
    void loadProcedures(const std::string& dir) {
        namespace fs = std::filesystem;
        if (!fs::exists(dir) || !fs::is_directory(dir)) {
            spdlog::info("QueryRouteHandler: No queries directory at {}", dir);
            return;
        }
        for (const auto& entry : fs::directory_iterator(dir)) {
            if (entry.path().extension() == ".json") {
                try {
                    std::ifstream f(entry.path());
                    auto def = nlohmann::json::parse(f);
                    std::string name = entry.path().stem().string();
                    procedures_[name] = def;
                    spdlog::debug("QueryRouteHandler: Loaded procedure '{}'", name);
                } catch (const std::exception& e) {
                    spdlog::warn("QueryRouteHandler: Failed to load {}: {}",
                                 entry.path().string(), e.what());
                }
            }
        }
        spdlog::info("QueryRouteHandler: Loaded {} procedures from {}", procedures_.size(), dir);
    }

    /**
     * Handle a query request: GET /{tenant}/{package}/query/{name}
     */
    void handle(
        const drogon::HttpRequestPtr& req,
        std::function<void(const drogon::HttpResponsePtr&)>&& callback,
        const std::string& tenant,
        const std::string& package,
        const std::string& name
    ) {
        auto it = procedures_.find(name);
        if (it == procedures_.end()) {
            ::Json::Value err;
            err["error"] = "Unknown procedure: " + name;
            auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
            resp->setStatusCode(drogon::HttpStatusCode::k404NotFound);
            callback(resp);
            return;
        }

        try {
            const auto& def = it->second;
            std::string entity = def.value("entity", name);

            // Build ListOptions from procedure definition + request query params
            ListOptions opts;
            if (def.contains("filter")) {
                for (auto& [k, v] : def["filter"].items()) {
                    opts.filter[k] = v.get<std::string>();
                }
            }
            if (def.contains("limit")) {
                opts.limit = def["limit"].get<int>();
            }

            // Override with request query parameters
            for (const auto& [key, val] : req->getParameters()) {
                if (key == "page") {
                    opts.page = std::stoi(val);
                } else if (key == "limit") {
                    opts.limit = std::stoi(val);
                } else {
                    opts.filter[key] = val;
                }
            }

            auto result = client_.listEntities(entity, opts);
            if (result.isOk()) {
                const auto& lr = result.value();
                nlohmann::json body = {
                    {"items", lr.items},
                    {"total", lr.total},
                    {"page", lr.page},
                    {"limit", lr.limit}
                };
                auto resp = drogon::HttpResponse::newHttpJsonResponse(nlohmann_to_jsoncpp(body));
                callback(resp);
            } else {
                ::Json::Value err;
                err["error"] = std::string(result.error().what());
                auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
                resp->setStatusCode(drogon::HttpStatusCode::k500InternalServerError);
                callback(resp);
            }
        } catch (const std::exception& e) {
            spdlog::error("QueryRouteHandler: Error executing '{}': {}", name, e.what());
            ::Json::Value err;
            err["error"] = std::string(e.what());
            auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
            resp->setStatusCode(drogon::HttpStatusCode::k500InternalServerError);
            callback(resp);
        }
    }

private:
    dbal::Client& client_;
    std::unordered_map<std::string, nlohmann::json> procedures_;
};

} // namespace handlers
} // namespace daemon
} // namespace dbal
