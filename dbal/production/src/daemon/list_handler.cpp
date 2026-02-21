#include "list_handler.hpp"
#include "json_convert.hpp"
#include <exception>
#include <spdlog/spdlog.h>
#include <nlohmann/json.hpp>

namespace dbal {
namespace daemon {
namespace rpc {

bool ListHandler::parseIntValue(const std::string& value, int& out) {
    try {
        size_t idx = 0;
        int parsed = std::stoi(value, &idx);
        if (idx != value.size()) {
            return false;
        }
        out = parsed;
        return true;
    } catch (const std::exception&) {
        return false;
    }
}

::Json::Value ListHandler::parseQueryParameters(
    const std::map<std::string, std::string>& query,
    ErrorSender send_error
) {
    ::Json::Value options(::Json::objectValue);
    ::Json::Value filter(::Json::objectValue);
    ::Json::Value sort(::Json::objectValue);

    bool limit_set = false;
    bool page_set = false;
    bool offset_set = false;
    int limit_value = 0;
    int page_value = 0;
    int offset_value = 0;

    for (const auto& [key, value] : query) {
        spdlog::trace("ListHandler::parseQueryParameters: param '{}' = '{}'", key, value);

        if (key == "limit" || key == "take") {
            if (!parseIntValue(value, limit_value) || limit_value <= 0) {
                ResponseFormatter::sendError(
                    "limit must be a positive integer",
                    400,
                    send_error
                );
                return ::Json::Value::null;
            }
            limit_set = true;
        } else if (key == "page") {
            if (!parseIntValue(value, page_value) || page_value <= 0) {
                ResponseFormatter::sendError(
                    "page must be a positive integer",
                    400,
                    send_error
                );
                return ::Json::Value::null;
            }
            page_set = true;
        } else if (key == "skip" || key == "offset") {
            if (!parseIntValue(value, offset_value) || offset_value < 0) {
                ResponseFormatter::sendError(
                    "offset must be a non-negative integer",
                    400,
                    send_error
                );
                return ::Json::Value::null;
            }
            offset_set = true;
        } else if (key.rfind("filter.", 0) == 0) {
            filter[key.substr(7)] = value;
        } else if (key.rfind("where.", 0) == 0) {
            filter[key.substr(6)] = value;
        } else if (key.rfind("sort.", 0) == 0) {
            sort[key.substr(5)] = value;
        } else if (key.rfind("orderBy.", 0) == 0) {
            sort[key.substr(8)] = value;
        }
    }

    // Convert offset to page if needed
    if (offset_set && !page_set) {
        int effective_limit = limit_set ? limit_value : 20;
        if (effective_limit <= 0) {
            ResponseFormatter::sendError(
                "limit must be a positive integer",
                400,
                send_error
            );
            return ::Json::Value::null;
        }
        page_value = (offset_value / effective_limit) + 1;
        page_set = true;
    }

    // Build options object
    if (limit_set) {
        options["limit"] = limit_value;
    }
    if (page_set) {
        options["page"] = page_value;
    }
    if (!filter.empty()) {
        options["filter"] = filter;
    }
    if (!sort.empty()) {
        options["sort"] = sort;
    }

    return options;
}

void ListHandler::handleList(
    Client& client,
    const RouteInfo& route,
    const std::map<std::string, std::string>& query,
    ResponseSender send_success,
    ErrorSender send_error
) {
    spdlog::trace("ListHandler::handleList: tenant='{}', entity='{}'",
                  route.tenant, route.entity);

    ResponseFormatter::withExceptionHandling([&]() {
        // Parse query parameters
        ::Json::Value options_json = parseQueryParameters(query, send_error);
        if (options_json.isNull()) {
            return;
        }

        // Build ListOptions from parsed query params
        ListOptions list_options;

        if (options_json.isMember("limit")) {
            list_options.limit = options_json["limit"].asInt();
        }
        if (options_json.isMember("page")) {
            list_options.page = options_json["page"].asInt();
        }
        if (options_json.isMember("filter")) {
            for (const auto& key : options_json["filter"].getMemberNames()) {
                list_options.filter[key] = options_json["filter"][key].asString();
            }
        }
        if (options_json.isMember("sort")) {
            for (const auto& key : options_json["sort"].getMemberNames()) {
                list_options.sort[key] = options_json["sort"][key].asString();
            }
        }

        // Always filter by tenant
        if (!route.tenant.empty()) {
            list_options.filter["tenantId"] = route.tenant;
        }

        auto result = client.listEntities(route.entity, list_options);
        if (!result.isOk()) {
            const auto& error = result.error();
            send_error(error.what(), static_cast<int>(error.code()));
            return;
        }

        const auto& listResult = result.value();

        // Build response
        ::Json::Value data(::Json::objectValue);
        ::Json::Value items(::Json::arrayValue);
        for (const auto& item : listResult.items) {
            items.append(nlohmann_to_jsoncpp(item));
        }
        data["data"] = items;
        data["total"] = listResult.total;
        data["page"] = listResult.page;
        data["limit"] = listResult.limit;

        send_success(data);
    }, send_error);
}

} // namespace rpc
} // namespace daemon
} // namespace dbal
