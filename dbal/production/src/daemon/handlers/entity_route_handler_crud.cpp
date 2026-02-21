/**
 * @file entity_route_handler_crud.cpp
 * @brief Implementation of RESTful entity CRUD route handlers
 */

#include "entity_route_handler.hpp"
#include "entity_route_handler_helpers.hpp"
#include "../rpc_restful_handler.hpp"
#include <spdlog/spdlog.h>

namespace dbal {
namespace daemon {
namespace handlers {

EntityRouteHandler::EntityRouteHandler(dbal::Client& client)
    : client_(client) {}

void EntityRouteHandler::handleEntity(
    const drogon::HttpRequestPtr& request,
    std::function<void(const drogon::HttpResponsePtr&)>&& callback,
    const std::string& tenant,
    const std::string& package,
    const std::string& entity
) {
    try {
        spdlog::trace("Entity handler: /{}/{}/{} method={}",
            tenant, package, entity, request->getMethodString());

        // Create response callbacks
        auto callbacks = createResponseCallbacks(std::move(callback));

        // Parse route
        std::string full_path = "/" + tenant + "/" + package + "/" + entity;
        auto route = rpc::parseRoute(full_path);

        // Parse request
        std::string method = parseHttpMethod(request);
        ::Json::Value body = parseRequestBody(request, method);
        auto query = parseQueryParameters(request);

        // Delegate to RPC handler
        rpc::handleRestfulRequest(
            client_,
            route,
            method,
            body,
            query,
            callbacks.send_success,
            callbacks.send_error
        );
    } catch (const std::exception& e) {
        spdlog::error("Entity handler exception: {}", e.what());
        sendErrorResponse(std::move(callback), "Internal server error");
    }
}

void EntityRouteHandler::handleEntityWithId(
    const drogon::HttpRequestPtr& request,
    std::function<void(const drogon::HttpResponsePtr&)>&& callback,
    const std::string& tenant,
    const std::string& package,
    const std::string& entity,
    const std::string& id
) {
    try {
        spdlog::trace("Entity+ID handler: /{}/{}/{}/{} method={}",
            tenant, package, entity, id, request->getMethodString());

        // Create response callbacks
        auto callbacks = createResponseCallbacks(std::move(callback));

        // Parse route
        std::string full_path = "/" + tenant + "/" + package + "/" + entity + "/" + id;
        auto route = rpc::parseRoute(full_path);

        // Parse request
        std::string method = parseHttpMethod(request);
        ::Json::Value body = parseRequestBody(request, method);
        auto query = parseQueryParameters(request);

        // Delegate to RPC handler
        rpc::handleRestfulRequest(
            client_,
            route,
            method,
            body,
            query,
            callbacks.send_success,
            callbacks.send_error
        );
    } catch (const std::exception& e) {
        spdlog::error("Entity handler exception: {}", e.what());
        sendErrorResponse(std::move(callback), "Internal server error");
    }
}

void EntityRouteHandler::handleEntityAction(
    const drogon::HttpRequestPtr& request,
    std::function<void(const drogon::HttpResponsePtr&)>&& callback,
    const std::string& tenant,
    const std::string& package,
    const std::string& entity,
    const std::string& id,
    const std::string& action
) {
    try {
        spdlog::trace("Entity action handler: /{}/{}/{}/{}/{} method={}",
            tenant, package, entity, id, action, request->getMethodString());

        // Create response callbacks
        auto callbacks = createResponseCallbacks(std::move(callback));

        // Parse route
        std::string full_path = "/" + tenant + "/" + package + "/" + entity + "/" + id + "/" + action;
        auto route = rpc::parseRoute(full_path);

        // Parse request
        std::string method = parseHttpMethod(request);
        ::Json::Value body = parseRequestBody(request, method);
        auto query = parseQueryParameters(request);

        // Delegate to RPC handler
        rpc::handleRestfulRequest(
            client_,
            route,
            method,
            body,
            query,
            callbacks.send_success,
            callbacks.send_error
        );
    } catch (const std::exception& e) {
        spdlog::error("Entity handler exception: {}", e.what());
        sendErrorResponse(std::move(callback), "Internal server error");
    }
}

} // namespace handlers
} // namespace daemon
} // namespace dbal
