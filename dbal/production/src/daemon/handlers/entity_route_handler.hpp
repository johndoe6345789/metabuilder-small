/**
 * @file entity_route_handler.hpp
 * @brief RESTful entity CRUD endpoint handlers
 */

#pragma once

#include <drogon/HttpRequest.h>
#include <drogon/HttpResponse.h>
#include <functional>
#include <memory>
#include "dbal/core/client.hpp"

namespace dbal {
namespace daemon {
namespace handlers {

/**
 * @class EntityRouteHandler
 * @brief Handles RESTful entity CRUD operations
 *
 * Supports multi-tenant entity routes in the format:
 * /{tenant}/{package}/{entity}[/{id}[/{action}]]
 *
 * Methods:
 * - GET    /{tenant}/{package}/{entity}          -> List entities
 * - POST   /{tenant}/{package}/{entity}          -> Create entity
 * - GET    /{tenant}/{package}/{entity}/{id}     -> Read entity
 * - PUT    /{tenant}/{package}/{entity}/{id}     -> Update entity
 * - PATCH  /{tenant}/{package}/{entity}/{id}     -> Partial update
 * - DELETE /{tenant}/{package}/{entity}/{id}     -> Delete entity
 * - POST   /{tenant}/{package}/{entity}/{id}/{action} -> Custom action
 */
class EntityRouteHandler {
public:
    explicit EntityRouteHandler(dbal::Client& client);

    /**
     * @brief Handle entity list/create operations
     * GET  -> List entities
     * POST -> Create entity
     */
    void handleEntity(
        const drogon::HttpRequestPtr& request,
        std::function<void(const drogon::HttpResponsePtr&)>&& callback,
        const std::string& tenant,
        const std::string& package,
        const std::string& entity
    );

    /**
     * @brief Handle entity CRUD operations with ID
     * GET    -> Read entity
     * PUT    -> Update entity
     * PATCH  -> Partial update
     * DELETE -> Delete entity
     */
    void handleEntityWithId(
        const drogon::HttpRequestPtr& request,
        std::function<void(const drogon::HttpResponsePtr&)>&& callback,
        const std::string& tenant,
        const std::string& package,
        const std::string& entity,
        const std::string& id
    );

    /**
     * @brief Handle custom entity actions
     * POST -> Execute custom action
     */
    void handleEntityAction(
        const drogon::HttpRequestPtr& request,
        std::function<void(const drogon::HttpResponsePtr&)>&& callback,
        const std::string& tenant,
        const std::string& package,
        const std::string& entity,
        const std::string& id,
        const std::string& action
    );

private:
    dbal::Client& client_;
};

} // namespace handlers
} // namespace daemon
} // namespace dbal
