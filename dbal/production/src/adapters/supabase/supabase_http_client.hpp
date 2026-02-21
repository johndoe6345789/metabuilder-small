#ifndef DBAL_SUPABASE_HTTP_CLIENT_HPP
#define DBAL_SUPABASE_HTTP_CLIENT_HPP

#include <string>
#include <nlohmann/json.hpp>
#include "dbal/errors.hpp"

namespace dbal {
namespace adapters {
namespace supabase {

using Json = nlohmann::json;

/**
 * HTTP Client - Wraps cpr library for Supabase REST API calls
 *
 * Handles all HTTP communication with Supabase PostgREST API
 * Builds consistent headers (apikey, Authorization, Prefer)
 * Parses JSON responses and handles HTTP status codes
 *
 * REST API Endpoints:
 * - POST   /rest/v1/{entity}                    - Create record(s)
 * - GET    /rest/v1/{entity}?filters            - List/read records
 * - PATCH  /rest/v1/{entity}?filters            - Update record(s)
 * - DELETE /rest/v1/{entity}?filters            - Delete record(s)
 *
 * Uses Supabase-specific headers:
 * - apikey: Supabase API key (anon or service_role)
 * - Authorization: Bearer token (same as apikey for now)
 * - Prefer: return=representation (return modified data)
 */
class SupabaseHttpClient {
public:
    SupabaseHttpClient(std::string base_url, std::string api_key, int timeout = 30000);

    /**
     * Set authentication token for requests (currently same as API key)
     */
    void setAuthToken(const std::string& token);

    /**
     * Execute HTTP POST request to /rest/v1/{endpoint}
     * Used for: create, createMany, upsert
     */
    Result<Json> post(const std::string& endpoint, const Json& body);

    /**
     * Execute HTTP GET request to /rest/v1/{resource_path}
     * Used for: read, list, findFirst, findByField
     */
    Result<Json> get(const std::string& resource_path);

    /**
     * Execute HTTP PATCH request (partial update)
     * Used for: update, updateMany
     */
    Result<Json> patch(const std::string& resource_path, const Json& body);

    /**
     * Execute HTTP DELETE request
     * Used for: remove, deleteMany
     */
    Result<bool> deleteRequest(const std::string& resource_path);

    /**
     * Build full URL with base + path
     */
    std::string buildUrl(const std::string& path) const;

    /**
     * Get current API key
     */
    const std::string& getApiKey() const { return api_key_; }

private:
    /**
     * Build standard headers for Supabase REST API
     * Includes: Content-Type, apikey, Authorization, Prefer
     */
    std::string buildAuthHeader() const;

    /**
     * Parse cpr::Response into Result<Json>
     * Handles HTTP status codes and error responses
     */
    Result<Json> handleResponse(const std::string& text, int status_code) const;

    std::string base_url_;     // https://your-project.supabase.co
    std::string api_key_;      // Supabase API key
    std::string auth_token_;   // Authentication token (currently same as api_key_)
    int timeout_;              // Request timeout in milliseconds
};

} // namespace supabase
} // namespace adapters
} // namespace dbal

#endif // DBAL_SUPABASE_HTTP_CLIENT_HPP
