#ifndef DBAL_ADAPTER_HPP
#define DBAL_ADAPTER_HPP

#include <string>
#include <vector>
#include <map>
#include <nlohmann/json.hpp>
#include "../types.hpp"
#include "../errors.hpp"

namespace dbal::adapters {

using Json = nlohmann::json;

// Generic list result wrapper
template<typename T>
struct ListResult {
    std::vector<T> items{};
    int total{0};
    int page{0};
    int limit{0};
};

// Entity field metadata
struct EntityField {
    std::string name{};
    std::string type{};         // "string", "number", "boolean", "timestamp", "json"
    bool required{false};
    bool unique{false};
    std::optional<std::string> defaultValue{};
    std::optional<std::string> references{};  // FK to other entity
};

// Entity schema metadata
struct EntitySchema {
    std::string name{};
    std::string displayName{};
    std::vector<EntityField> fields{};
    std::vector<std::string> indexes{};
    std::map<std::string, std::string> metadata{};
};

/**
 * Generic DBAL Adapter Interface
 *
 * Entities are NOT hardcoded - they are loaded dynamically from YAML schemas
 * All operations use entity name + JSON data instead of typed structs
 *
 * This matches the TypeScript DBAL pattern (see /dbal/development/src/core/client/)
 */
class Adapter {
public:
    virtual ~Adapter() = default;

    // ===== Generic CRUD Operations =====
    // Works for ANY entity loaded from YAML schemas

    virtual Result<Json> create(const std::string& entityName, const Json& data) = 0;
    virtual Result<Json> read(const std::string& entityName, const std::string& id) = 0;
    virtual Result<Json> update(const std::string& entityName, const std::string& id, const Json& data) = 0;
    virtual Result<bool> remove(const std::string& entityName, const std::string& id) = 0;
    virtual Result<ListResult<Json>> list(const std::string& entityName, const ListOptions& options) = 0;

    // ===== Bulk Operations =====

    virtual Result<int> createMany(const std::string& entityName, const std::vector<Json>& records) = 0;
    virtual Result<int> updateMany(const std::string& entityName, const Json& filter, const Json& data) = 0;
    virtual Result<int> deleteMany(const std::string& entityName, const Json& filter) = 0;

    // ===== Query Operations =====

    virtual Result<Json> findFirst(const std::string& entityName, const Json& filter) = 0;
    virtual Result<Json> findByField(const std::string& entityName, const std::string& field, const Json& value) = 0;
    virtual Result<Json> upsert(const std::string& entityName, const std::string& uniqueField, const Json& uniqueValue, const Json& createData, const Json& updateData) = 0;

    // ===== Metadata =====

    virtual Result<std::vector<std::string>> getAvailableEntities() = 0;
    virtual Result<EntitySchema> getEntitySchema(const std::string& entityName) = 0;

    virtual void close() = 0;

    // ===== Transaction Operations =====

    virtual bool supportsNativeTransactions() const { return false; }
    virtual Result<bool> beginTransaction() { return Error::internal("Transactions not supported by this adapter"); }
    virtual Result<bool> commitTransaction() { return Error::internal("Transactions not supported by this adapter"); }
    virtual Result<bool> rollbackTransaction() { return Error::internal("Transactions not supported by this adapter"); }
};

} // namespace dbal::adapters

#endif
