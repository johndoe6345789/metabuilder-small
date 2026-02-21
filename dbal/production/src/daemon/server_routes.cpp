/**
 * @file server_routes.cpp
 * @brief Route registration using clean architecture handlers
 */

#include "server.hpp"
#include "handlers/health_route_handler.hpp"
#include "handlers/entity_route_handler.hpp"
#include "handlers/blob_route_handler.hpp"
#include "handlers/rpc_route_handler.hpp"
#include "handlers/schema_route_handler.hpp"
#include "handlers/admin_route_handler.hpp"
#include "handlers/batch_route_handler.hpp"
#include "handlers/entity_route_handler_helpers.hpp"
#include "bulk_handler.hpp"
#include "rpc_restful_handler.hpp"

// Blob storage backends
#include "../blob/memory_storage.hpp"
#include "../blob/filesystem_storage.hpp"
#include "../blob/s3_storage.hpp"

#include <chrono>
#include <cstdlib>
#include <drogon/drogon.h>
#include <filesystem>
#include <mutex>
#include <spdlog/spdlog.h>
#include <sstream>
#include <unordered_map>

namespace {
    struct RateLimitEntry {
        int count = 0;
        std::chrono::steady_clock::time_point window_start = std::chrono::steady_clock::now();
    };

    class SimpleRateLimiter {
    public:
        SimpleRateLimiter(int max_requests, int window_seconds)
            : max_requests_(max_requests), window_seconds_(window_seconds) {}

        bool allow(const std::string& key) {
            std::lock_guard<std::mutex> lock(mutex_);
            auto now = std::chrono::steady_clock::now();
            auto& entry = entries_[key];
            auto elapsed = std::chrono::duration_cast<std::chrono::seconds>(now - entry.window_start).count();
            if (elapsed >= window_seconds_) {
                entry.count = 0;
                entry.window_start = now;
            }
            if (entry.count >= max_requests_) {
                return false;
            }
            entry.count++;
            return true;
        }
    private:
        int max_requests_;
        int window_seconds_;
        std::mutex mutex_;
        std::unordered_map<std::string, RateLimitEntry> entries_;
    };

    static SimpleRateLimiter admin_limiter(10, 60);    // 10 req/min for admin
    static SimpleRateLimiter mutation_limiter(50, 60);  // 50 req/min for mutations
    static SimpleRateLimiter read_limiter(100, 60);     // 100 req/min for reads
}

namespace dbal {
namespace daemon {

using DrogonCallback = std::function<void(const drogon::HttpResponsePtr&)>;

void Server::registerRoutes() {
    if (routes_registered_.exchange(true)) {
        return;
    }

    // Initialize handlers
    auto health_handler = std::make_shared<handlers::HealthRouteHandler>(address());

    // Get schema paths from environment or use defaults
    const char* env_registry = std::getenv("DBAL_SCHEMA_REGISTRY_PATH");
    const char* env_packages = std::getenv("DBAL_PACKAGES_PATH");
    const char* env_output = std::getenv("DBAL_PRISMA_OUTPUT_PATH");

    const std::string registry_path = env_registry ? env_registry : "/app/prisma/schema-registry.json";
    const std::string packages_path = env_packages ? env_packages : "/app/packages";
    const std::string output_path = env_output ? env_output : "/app/prisma/generated-from-packages.prisma";

    auto schema_handler = std::make_shared<handlers::SchemaRouteHandler>(
        registry_path, packages_path, output_path
    );

    // Register health routes
    drogon::app().registerHandler(
        "/health",
        [health_handler](const drogon::HttpRequestPtr& req, DrogonCallback&& callback) {
            health_handler->handleHealth(req, std::move(callback));
        },
        {drogon::HttpMethod::Get, drogon::HttpMethod::Options}
    );

    drogon::app().registerHandler(
        "/healthz",
        [health_handler](const drogon::HttpRequestPtr& req, DrogonCallback&& callback) {
            health_handler->handleHealth(req, std::move(callback));
        },
        {drogon::HttpMethod::Get, drogon::HttpMethod::Options}
    );

    drogon::app().registerHandler(
        "/version",
        [health_handler](const drogon::HttpRequestPtr& req, DrogonCallback&& callback) {
            health_handler->handleVersion(req, std::move(callback));
        },
        {drogon::HttpMethod::Get, drogon::HttpMethod::Options}
    );

    drogon::app().registerHandler(
        "/api/version",
        [health_handler](const drogon::HttpRequestPtr& req, DrogonCallback&& callback) {
            health_handler->handleVersion(req, std::move(callback));
        },
        {drogon::HttpMethod::Get, drogon::HttpMethod::Options}
    );

    drogon::app().registerHandler(
        "/status",
        [health_handler](const drogon::HttpRequestPtr& req, DrogonCallback&& callback) {
            health_handler->handleStatus(req, std::move(callback));
        },
        {drogon::HttpMethod::Get, drogon::HttpMethod::Options}
    );

    drogon::app().registerHandler(
        "/api/status",
        [health_handler](const drogon::HttpRequestPtr& req, DrogonCallback&& callback) {
            health_handler->handleStatus(req, std::move(callback));
        },
        {drogon::HttpMethod::Get, drogon::HttpMethod::Options}
    );

    // Register schema management route
    drogon::app().registerHandler(
        "/api/dbal/schema",
        [schema_handler](const drogon::HttpRequestPtr& req, DrogonCallback&& callback) {
            schema_handler->handleSchema(req, std::move(callback));
        },
        {drogon::HttpMethod::Get, drogon::HttpMethod::Post}
    );

    // Admin route handler — uses callbacks into Server for adapter switching
    auto admin_handler = std::make_shared<handlers::AdminRouteHandler>(
        // getConfig
        [this]() -> std::pair<std::string, std::string> {
            return getActiveConfig();
        },
        // switchAdapter
        [this](const std::string& adapter, const std::string& url) -> bool {
            return switchAdapter(adapter, url);
        },
        // testConnection
        [this](const std::string& adapter, const std::string& url, std::string& error) -> bool {
            return testConnection(adapter, url, error);
        }
    );

    // GET/POST /admin/config — current config / switch database
    // Route is /admin/* (not /api/admin/*) to avoid collision with entity wildcard /{t}/{p}/{e}
    // Nginx strips /api/ prefix, so browser calls /api/admin/config → DBAL gets /admin/config
    drogon::app().registerHandler(
        "/admin/config",
        [admin_handler](const drogon::HttpRequestPtr& req, DrogonCallback&& callback) {
            auto client_ip = req->getPeerAddr().toIp();
            if (!admin_limiter.allow(client_ip)) {
                auto resp = drogon::HttpResponse::newHttpResponse();
                resp->setStatusCode(drogon::k429TooManyRequests);
                callback(resp);
                return;
            }
            if (req->method() == drogon::HttpMethod::Post) {
                admin_handler->handlePostConfig(req, std::move(callback));
            } else {
                admin_handler->handleGetConfig(req, std::move(callback));
            }
        },
        {drogon::HttpMethod::Get, drogon::HttpMethod::Post, drogon::HttpMethod::Options}
    );

    // GET /admin/adapters — list all supported backends
    drogon::app().registerHandler(
        "/admin/adapters",
        [admin_handler](const drogon::HttpRequestPtr& req, DrogonCallback&& callback) {
            auto client_ip = req->getPeerAddr().toIp();
            if (!admin_limiter.allow(client_ip)) {
                auto resp = drogon::HttpResponse::newHttpResponse();
                resp->setStatusCode(drogon::k429TooManyRequests);
                callback(resp);
                return;
            }
            admin_handler->handleGetAdapters(req, std::move(callback));
        },
        {drogon::HttpMethod::Get, drogon::HttpMethod::Options}
    );

    // POST /admin/test-connection — test without switching
    drogon::app().registerHandler(
        "/admin/test-connection",
        [admin_handler](const drogon::HttpRequestPtr& req, DrogonCallback&& callback) {
            auto client_ip = req->getPeerAddr().toIp();
            if (!admin_limiter.allow(client_ip)) {
                auto resp = drogon::HttpResponse::newHttpResponse();
                resp->setStatusCode(drogon::k429TooManyRequests);
                callback(resp);
                return;
            }
            admin_handler->handleTestConnection(req, std::move(callback));
        },
        {drogon::HttpMethod::Post, drogon::HttpMethod::Options}
    );

    // RPC route requires client - register with ensureClient check
    drogon::app().registerHandler(
        "/api/dbal",
        [this](const drogon::HttpRequestPtr& req, DrogonCallback&& callback) {
            auto client_ip = req->getPeerAddr().toIp();
            if (!mutation_limiter.allow(client_ip)) {
                auto resp = drogon::HttpResponse::newHttpResponse();
                resp->setStatusCode(drogon::k429TooManyRequests);
                callback(resp);
                return;
            }
            if (!ensureClient()) {
                ::Json::Value body;
                body["success"] = false;
                body["message"] = "DBAL client is unavailable";
                auto response = drogon::HttpResponse::newHttpJsonResponse(body);
                response->setStatusCode(drogon::HttpStatusCode::k503ServiceUnavailable);
                callback(response);
                return;
            }
            auto rpc_handler = std::make_shared<handlers::RpcRouteHandler>(*dbal_client_);
            rpc_handler->handleRpc(req, std::move(callback));
        },
        {drogon::HttpMethod::Post}
    );

    // ===== Bulk operations — transactional (single entity) =====
    // Registered BEFORE generic entity routes so /_bulk/* patterns match first

    // POST /{tenant}/{package}/{entity}/_bulk/create
    drogon::app().registerHandler(
        "/{tenant}/{package}/{entity}/_bulk/create",
        [this](const drogon::HttpRequestPtr& req, DrogonCallback&& callback,
               const std::string& tenant, const std::string& package, const std::string& entity) {
            auto client_ip = req->getPeerAddr().toIp();
            if (!mutation_limiter.allow(client_ip)) {
                auto resp = drogon::HttpResponse::newHttpResponse();
                resp->setStatusCode(drogon::k429TooManyRequests);
                callback(resp);
                return;
            }
            if (!ensureClient()) {
                ::Json::Value body;
                body["success"] = false;
                body["error"] = "DBAL client is unavailable";
                auto response = drogon::HttpResponse::newHttpJsonResponse(body);
                response->setStatusCode(drogon::HttpStatusCode::k503ServiceUnavailable);
                callback(response);
                return;
            }

            // Parse body
            std::string bodyStr(req->getBody());
            ::Json::Value body;
            {
                std::istringstream stream(bodyStr);
                ::Json::CharReaderBuilder reader;
                JSONCPP_STRING errs;
                if (!::Json::parseFromStream(reader, stream, &body, &errs) || !errs.empty()) {
                    body = ::Json::Value(::Json::arrayValue);
                }
            }

            // Build RouteInfo
            std::string full_path = "/" + tenant + "/" + package + "/" + entity;
            auto route = rpc::parseRoute(full_path);

            // Create response callbacks
            auto callbacks = handlers::createResponseCallbacks(std::move(callback));

            rpc::BulkHandler::handleBulkCreate(
                *dbal_client_, route, body,
                callbacks.send_success, callbacks.send_error
            );
        },
        {drogon::HttpMethod::Post}
    );

    // POST /{tenant}/{package}/{entity}/_bulk/update
    drogon::app().registerHandler(
        "/{tenant}/{package}/{entity}/_bulk/update",
        [this](const drogon::HttpRequestPtr& req, DrogonCallback&& callback,
               const std::string& tenant, const std::string& package, const std::string& entity) {
            auto client_ip = req->getPeerAddr().toIp();
            if (!mutation_limiter.allow(client_ip)) {
                auto resp = drogon::HttpResponse::newHttpResponse();
                resp->setStatusCode(drogon::k429TooManyRequests);
                callback(resp);
                return;
            }
            if (!ensureClient()) {
                ::Json::Value body;
                body["success"] = false;
                body["error"] = "DBAL client is unavailable";
                auto response = drogon::HttpResponse::newHttpJsonResponse(body);
                response->setStatusCode(drogon::HttpStatusCode::k503ServiceUnavailable);
                callback(response);
                return;
            }

            // Parse body
            std::string bodyStr(req->getBody());
            ::Json::Value body;
            {
                std::istringstream stream(bodyStr);
                ::Json::CharReaderBuilder reader;
                JSONCPP_STRING errs;
                if (!::Json::parseFromStream(reader, stream, &body, &errs) || !errs.empty()) {
                    body = ::Json::Value(::Json::arrayValue);
                }
            }

            // Build RouteInfo
            std::string full_path = "/" + tenant + "/" + package + "/" + entity;
            auto route = rpc::parseRoute(full_path);

            // Create response callbacks
            auto callbacks = handlers::createResponseCallbacks(std::move(callback));

            rpc::BulkHandler::handleBulkUpdate(
                *dbal_client_, route, body,
                callbacks.send_success, callbacks.send_error
            );
        },
        {drogon::HttpMethod::Post}
    );

    // POST /{tenant}/{package}/{entity}/_bulk/delete
    drogon::app().registerHandler(
        "/{tenant}/{package}/{entity}/_bulk/delete",
        [this](const drogon::HttpRequestPtr& req, DrogonCallback&& callback,
               const std::string& tenant, const std::string& package, const std::string& entity) {
            auto client_ip = req->getPeerAddr().toIp();
            if (!mutation_limiter.allow(client_ip)) {
                auto resp = drogon::HttpResponse::newHttpResponse();
                resp->setStatusCode(drogon::k429TooManyRequests);
                callback(resp);
                return;
            }
            if (!ensureClient()) {
                ::Json::Value body;
                body["success"] = false;
                body["error"] = "DBAL client is unavailable";
                auto response = drogon::HttpResponse::newHttpJsonResponse(body);
                response->setStatusCode(drogon::HttpStatusCode::k503ServiceUnavailable);
                callback(response);
                return;
            }

            // Parse body
            std::string bodyStr(req->getBody());
            ::Json::Value body;
            {
                std::istringstream stream(bodyStr);
                ::Json::CharReaderBuilder reader;
                JSONCPP_STRING errs;
                if (!::Json::parseFromStream(reader, stream, &body, &errs) || !errs.empty()) {
                    body = ::Json::Value(::Json::arrayValue);
                }
            }

            // Build RouteInfo
            std::string full_path = "/" + tenant + "/" + package + "/" + entity;
            auto route = rpc::parseRoute(full_path);

            // Create response callbacks
            auto callbacks = handlers::createResponseCallbacks(std::move(callback));

            rpc::BulkHandler::handleBulkDelete(
                *dbal_client_, route, body,
                callbacks.send_success, callbacks.send_error
            );
        },
        {drogon::HttpMethod::Post}
    );

    // ===== Batch operations — multi-entity transactional =====
    // POST /{tenant}/{package}/_batch
    drogon::app().registerHandler(
        "/{tenant}/{package}/_batch",
        [this](const drogon::HttpRequestPtr& req, DrogonCallback&& callback,
               const std::string& tenant, const std::string& package) {
            auto client_ip = req->getPeerAddr().toIp();
            if (!mutation_limiter.allow(client_ip)) {
                auto resp = drogon::HttpResponse::newHttpResponse();
                resp->setStatusCode(drogon::k429TooManyRequests);
                callback(resp);
                return;
            }
            if (!ensureClient()) {
                ::Json::Value body;
                body["success"] = false;
                body["error"] = "DBAL client is unavailable";
                auto response = drogon::HttpResponse::newHttpJsonResponse(body);
                response->setStatusCode(drogon::HttpStatusCode::k503ServiceUnavailable);
                callback(response);
                return;
            }

            auto batch_handler = std::make_shared<handlers::BatchRouteHandler>(*dbal_client_);
            batch_handler->handleBatch(req, std::move(callback), tenant, package);
        },
        {drogon::HttpMethod::Post}
    );

    // ===== Blob storage routes =====
    // Registered BEFORE generic entity routes so /{tenant}/{package}/blob/*
    // patterns match before the /{tenant}/{package}/{entity} wildcard.
    //
    // Blob storage backend selection:
    // - DBAL_BLOB_BACKEND env var: "memory" (default), "filesystem", "s3"
    // - DBAL_BLOB_ROOT env var: root directory for filesystem backend
    //   (default: /tmp/dbal-blobs)

    auto createBlobStorage = []() -> std::shared_ptr<blob::BlobStorage> {
        const char* env_backend = std::getenv("DBAL_BLOB_BACKEND");
        std::string backend = env_backend ? env_backend : "memory";

        if (backend == "filesystem") {
            const char* env_root = std::getenv("DBAL_BLOB_ROOT");
            std::string root = env_root ? env_root : "/tmp/dbal-blobs";
            spdlog::info("Blob storage: filesystem (root={})", root);
            return std::make_shared<blob::FilesystemStorage>(std::filesystem::path(root));
        }

        if (backend == "s3") {
            blob::S3Config s3cfg;
            auto env_or = [](const char* name, const char* fallback) -> std::string {
                const char* v = std::getenv(name);
                return v ? v : fallback;
            };
            s3cfg.endpoint   = env_or("DBAL_BLOB_URL", "http://localhost:9000");
            s3cfg.bucket     = env_or("DBAL_BLOB_BUCKET", "dbal-storage");
            s3cfg.region     = env_or("DBAL_BLOB_REGION", "us-east-1");
            s3cfg.access_key = env_or("DBAL_BLOB_ACCESS_KEY", "");
            s3cfg.secret_key = env_or("DBAL_BLOB_SECRET_KEY", "");
            const char* path_style = std::getenv("DBAL_BLOB_PATH_STYLE");
            s3cfg.use_path_style = !path_style || std::string(path_style) != "false";
            spdlog::info("Blob storage: s3 (endpoint={}, bucket={})", s3cfg.endpoint, s3cfg.bucket);
            return std::make_shared<blob::S3Storage>(std::move(s3cfg));
        }

        // Default to memory storage
        spdlog::info("Blob storage: memory");
        return std::make_shared<blob::MemoryStorage>();
    };

    auto blob_storage = createBlobStorage();
    auto blob_handler = std::make_shared<handlers::BlobRouteHandler>(blob_storage);

    // GET /{tenant}/{package}/blob/_stats — storage statistics
    // Registered first so "_stats" literal matches before {key} wildcard
    drogon::app().registerHandler(
        "/{tenant}/{package}/blob/_stats",
        [blob_handler](const drogon::HttpRequestPtr& req, DrogonCallback&& callback,
                       const std::string& tenant, const std::string& package) {
            auto client_ip = req->getPeerAddr().toIp();
            if (!read_limiter.allow(client_ip)) {
                auto resp = drogon::HttpResponse::newHttpResponse();
                resp->setStatusCode(drogon::k429TooManyRequests);
                callback(resp);
                return;
            }
            blob_handler->handleBlobStats(req, std::move(callback), tenant, package);
        },
        {drogon::HttpMethod::Get, drogon::HttpMethod::Options}
    );

    // GET /{tenant}/{package}/blob — list blobs
    drogon::app().registerHandler(
        "/{tenant}/{package}/blob",
        [blob_handler](const drogon::HttpRequestPtr& req, DrogonCallback&& callback,
                       const std::string& tenant, const std::string& package) {
            auto client_ip = req->getPeerAddr().toIp();
            if (!read_limiter.allow(client_ip)) {
                auto resp = drogon::HttpResponse::newHttpResponse();
                resp->setStatusCode(drogon::k429TooManyRequests);
                callback(resp);
                return;
            }
            blob_handler->handleBlobList(req, std::move(callback), tenant, package);
        },
        {drogon::HttpMethod::Get, drogon::HttpMethod::Options}
    );

    // GET/POST /{tenant}/{package}/blob/{key}/{action} — presign, copy
    // Registered before the single-key route so /blob/{key}/presign and
    // /blob/{key}/copy match before /blob/{key}
    drogon::app().registerHandler(
        "/{tenant}/{package}/blob/{key}/{action}",
        [blob_handler](const drogon::HttpRequestPtr& req, DrogonCallback&& callback,
                       const std::string& tenant, const std::string& package,
                       const std::string& key, const std::string& action) {
            auto client_ip = req->getPeerAddr().toIp();
            auto& limiter = (req->method() == drogon::HttpMethod::Get) ? read_limiter : mutation_limiter;
            if (!limiter.allow(client_ip)) {
                auto resp = drogon::HttpResponse::newHttpResponse();
                resp->setStatusCode(drogon::k429TooManyRequests);
                callback(resp);
                return;
            }
            blob_handler->handleBlobAction(req, std::move(callback), tenant, package, key, action);
        },
        {drogon::HttpMethod::Get, drogon::HttpMethod::Post, drogon::HttpMethod::Options}
    );

    // PUT/GET/DELETE/HEAD /{tenant}/{package}/blob/{key} — single blob CRUD
    drogon::app().registerHandler(
        "/{tenant}/{package}/blob/{key}",
        [blob_handler](const drogon::HttpRequestPtr& req, DrogonCallback&& callback,
                       const std::string& tenant, const std::string& package,
                       const std::string& key) {
            auto client_ip = req->getPeerAddr().toIp();
            auto& limiter = (req->method() == drogon::HttpMethod::Get ||
                             req->method() == drogon::HttpMethod::Head)
                            ? read_limiter : mutation_limiter;
            if (!limiter.allow(client_ip)) {
                auto resp = drogon::HttpResponse::newHttpResponse();
                resp->setStatusCode(drogon::k429TooManyRequests);
                callback(resp);
                return;
            }
            blob_handler->handleBlobWithKey(req, std::move(callback), tenant, package, key);
        },
        {drogon::HttpMethod::Get, drogon::HttpMethod::Put,
         drogon::HttpMethod::Delete, drogon::HttpMethod::Head,
         drogon::HttpMethod::Options}
    );

    // RESTful entity routes require client
    drogon::app().registerHandler(
        "/{tenant}/{package}/{entity}",
        [this](const drogon::HttpRequestPtr& req, DrogonCallback&& callback,
               const std::string& tenant, const std::string& package, const std::string& entity) {
            auto client_ip = req->getPeerAddr().toIp();
            auto& limiter = (req->method() == drogon::HttpMethod::Get) ? read_limiter : mutation_limiter;
            if (!limiter.allow(client_ip)) {
                auto resp = drogon::HttpResponse::newHttpResponse();
                resp->setStatusCode(drogon::k429TooManyRequests);
                callback(resp);
                return;
            }
            if (!ensureClient()) {
                ::Json::Value body;
                body["success"] = false;
                body["error"] = "DBAL client is unavailable";
                auto response = drogon::HttpResponse::newHttpJsonResponse(body);
                response->setStatusCode(drogon::HttpStatusCode::k503ServiceUnavailable);
                callback(response);
                return;
            }
            auto entity_handler = std::make_shared<handlers::EntityRouteHandler>(*dbal_client_);
            entity_handler->handleEntity(req, std::move(callback), tenant, package, entity);
        },
        {drogon::HttpMethod::Get, drogon::HttpMethod::Post}
    );

    drogon::app().registerHandler(
        "/{tenant}/{package}/{entity}/{id}",
        [this](const drogon::HttpRequestPtr& req, DrogonCallback&& callback,
               const std::string& tenant, const std::string& package,
               const std::string& entity, const std::string& id) {
            auto client_ip = req->getPeerAddr().toIp();
            auto& limiter = (req->method() == drogon::HttpMethod::Get) ? read_limiter : mutation_limiter;
            if (!limiter.allow(client_ip)) {
                auto resp = drogon::HttpResponse::newHttpResponse();
                resp->setStatusCode(drogon::k429TooManyRequests);
                callback(resp);
                return;
            }
            if (!ensureClient()) {
                ::Json::Value body;
                body["success"] = false;
                body["error"] = "DBAL client is unavailable";
                auto response = drogon::HttpResponse::newHttpJsonResponse(body);
                response->setStatusCode(drogon::HttpStatusCode::k503ServiceUnavailable);
                callback(response);
                return;
            }
            auto entity_handler = std::make_shared<handlers::EntityRouteHandler>(*dbal_client_);
            entity_handler->handleEntityWithId(req, std::move(callback), tenant, package, entity, id);
        },
        {drogon::HttpMethod::Get, drogon::HttpMethod::Post,
         drogon::HttpMethod::Put, drogon::HttpMethod::Patch,
         drogon::HttpMethod::Delete}
    );

    drogon::app().registerHandler(
        "/{tenant}/{package}/{entity}/{id}/{action}",
        [this](const drogon::HttpRequestPtr& req, DrogonCallback&& callback,
               const std::string& tenant, const std::string& package,
               const std::string& entity, const std::string& id, const std::string& action) {
            auto client_ip = req->getPeerAddr().toIp();
            auto& limiter = (req->method() == drogon::HttpMethod::Get) ? read_limiter : mutation_limiter;
            if (!limiter.allow(client_ip)) {
                auto resp = drogon::HttpResponse::newHttpResponse();
                resp->setStatusCode(drogon::k429TooManyRequests);
                callback(resp);
                return;
            }
            if (!ensureClient()) {
                ::Json::Value body;
                body["success"] = false;
                body["error"] = "DBAL client is unavailable";
                auto response = drogon::HttpResponse::newHttpJsonResponse(body);
                response->setStatusCode(drogon::HttpStatusCode::k503ServiceUnavailable);
                callback(response);
                return;
            }
            auto entity_handler = std::make_shared<handlers::EntityRouteHandler>(*dbal_client_);
            entity_handler->handleEntityAction(req, std::move(callback), tenant, package, entity, id, action);
        },
        {drogon::HttpMethod::Get, drogon::HttpMethod::Post}
    );

}

} // namespace daemon
} // namespace dbal
