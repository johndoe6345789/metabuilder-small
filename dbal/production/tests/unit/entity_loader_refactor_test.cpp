/**
 * @file entity_loader_refactor_test.cpp
 * @brief Unit tests for refactored entity loader components
 */

#include <gtest/gtest.h>
#include "dbal/core/loaders/yaml_parser.hpp"
#include "dbal/core/loaders/field_parser.hpp"
#include "dbal/core/loaders/relation_parser.hpp"
#include "dbal/core/loaders/schema_validator.hpp"
#include "dbal/core/loaders/schema_cache.hpp"
#include "dbal/core/entity_loader.hpp"

using namespace dbal::core;
using namespace dbal::core::loaders;

// Test YamlParser
TEST(YamlParserTest, FileExists) {
    YamlParser parser;

    // Create temporary test file
    std::string testFile = "/tmp/test_entity.yaml";
    std::ofstream out(testFile);
    out << "entity: test\nfields:\n  id:\n    type: uuid\n";
    out.close();

    EXPECT_TRUE(parser.fileExists(testFile));
    EXPECT_FALSE(parser.fileExists("/tmp/nonexistent.yaml"));

    std::remove(testFile.c_str());
}

TEST(YamlParserTest, LoadFile) {
    YamlParser parser;

    // Create temporary test file
    std::string testFile = "/tmp/test_entity.yaml";
    std::ofstream out(testFile);
    out << "entity: test\nfields:\n  id:\n    type: uuid\n";
    out.close();

    YAML::Node node = parser.loadFile(testFile);
    EXPECT_EQ(node["entity"].as<std::string>(), "test");

    std::remove(testFile.c_str());
}

// Test FieldParser
TEST(FieldParserTest, ParseBasicField) {
    FieldParser parser;

    YAML::Node fieldNode;
    fieldNode["type"] = "string";
    fieldNode["required"] = true;
    fieldNode["maxLength"] = 255;

    EntityField field = parser.parseField("name", fieldNode);

    EXPECT_EQ(field.name, "name");
    EXPECT_EQ(field.type, "string");
    EXPECT_TRUE(field.required);
    EXPECT_EQ(*field.maxLength, 255);
}

TEST(FieldParserTest, ParseEnumField) {
    FieldParser parser;

    YAML::Node fieldNode;
    fieldNode["type"] = "enum";
    fieldNode["values"] = std::vector<std::string>{"draft", "published", "archived"};

    EntityField field = parser.parseField("status", fieldNode);

    EXPECT_EQ(field.type, "enum");
    ASSERT_TRUE(field.enumValues.has_value());
    EXPECT_EQ(field.enumValues->size(), 3);
    EXPECT_EQ((*field.enumValues)[0], "draft");
}

// Test RelationParser
TEST(RelationParserTest, ParseIndex) {
    RelationParser parser;

    YAML::Node indexNode;
    indexNode["fields"] = std::vector<std::string>{"userId", "tenantId"};
    indexNode["unique"] = true;
    indexNode["name"] = "idx_user_tenant";

    EntityIndex index = parser.parseIndex(indexNode);

    EXPECT_EQ(index.fields.size(), 2);
    EXPECT_EQ(index.fields[0], "userId");
    EXPECT_TRUE(index.unique);
    EXPECT_EQ(*index.name, "idx_user_tenant");
}

TEST(RelationParserTest, ParseACL) {
    RelationParser parser;

    YAML::Node aclNode;
    aclNode["read"]["admin"] = true;
    aclNode["read"]["user"] = true;
    aclNode["create"]["admin"] = true;
    aclNode["create"]["user"] = false;

    EntitySchema::ACL acl = parser.parseACL(aclNode);

    EXPECT_TRUE(acl.read["admin"]);
    EXPECT_TRUE(acl.read["user"]);
    EXPECT_TRUE(acl.create["admin"]);
    EXPECT_FALSE(acl.create["user"]);
}

// Test SchemaValidator
TEST(SchemaValidatorTest, ValidateBasicSchema) {
    SchemaValidator validator;

    EntitySchema schema;
    schema.name = "user";
    schema.version = "1.0";

    EntityField idField;
    idField.name = "id";
    idField.type = "uuid";
    idField.primary = true;
    schema.fields.push_back(idField);

    ValidationResult result = validator.validate(schema);

    EXPECT_TRUE(result.isValid());
    EXPECT_EQ(result.errors.size(), 0);
}

TEST(SchemaValidatorTest, DetectMissingName) {
    SchemaValidator validator;

    EntitySchema schema;
    schema.name = "";  // Invalid: no name

    ValidationResult result = validator.validate(schema);

    EXPECT_FALSE(result.isValid());
    EXPECT_GT(result.errors.size(), 0);
}

TEST(SchemaValidatorTest, DetectInvalidFieldType) {
    SchemaValidator validator;

    EntitySchema schema;
    schema.name = "test";

    EntityField field;
    field.name = "value";
    field.type = "invalid_type";  // Invalid type
    schema.fields.push_back(field);

    ValidationResult result = validator.validate(schema);

    EXPECT_FALSE(result.isValid());
    EXPECT_GT(result.errors.size(), 0);
}

// Test SchemaCache
TEST(SchemaCacheTest, PutAndGet) {
    SchemaCache cache;

    EntitySchema schema;
    schema.name = "user";
    schema.displayName = "User";

    cache.put("user", schema);

    auto retrieved = cache.get("user");
    ASSERT_TRUE(retrieved.has_value());
    EXPECT_EQ(retrieved->name, "user");
    EXPECT_EQ(retrieved->displayName, "User");
}

TEST(SchemaCacheTest, Contains) {
    SchemaCache cache;

    EntitySchema schema;
    schema.name = "user";
    cache.put("user", schema);

    EXPECT_TRUE(cache.contains("user"));
    EXPECT_FALSE(cache.contains("workflow"));
}

TEST(SchemaCacheTest, Remove) {
    SchemaCache cache;

    EntitySchema schema;
    schema.name = "user";
    cache.put("user", schema);

    EXPECT_TRUE(cache.contains("user"));

    cache.remove("user");

    EXPECT_FALSE(cache.contains("user"));
}

TEST(SchemaCacheTest, Clear) {
    SchemaCache cache;

    EntitySchema schema1;
    schema1.name = "user";
    cache.put("user", schema1);

    EntitySchema schema2;
    schema2.name = "workflow";
    cache.put("workflow", schema2);

    EXPECT_EQ(cache.size(), 2);

    cache.clear();

    EXPECT_EQ(cache.size(), 0);
}

// Integration test for full loading
TEST(EntitySchemaLoaderTest, LoadSchemaIntegration) {
    // This test requires actual YAML schema files
    // Skip if directory doesn't exist
    if (!std::filesystem::exists("dbal/shared/api/schema/entities")) {
        GTEST_SKIP() << "Schema directory not found";
    }

    EntitySchemaLoader loader;
    std::string schemaPath = EntitySchemaLoader::getDefaultSchemaPath();

    auto schemas = loader.loadSchemas(schemaPath);

    EXPECT_GT(schemas.size(), 0) << "Should load at least one schema";

    // Check that common entities are loaded
    if (schemas.find("user") != schemas.end()) {
        const auto& userSchema = schemas["user"];
        EXPECT_EQ(userSchema.name, "user");
        EXPECT_GT(userSchema.fields.size(), 0);
    }
}

int main(int argc, char** argv) {
    ::testing::InitGoogleTest(&argc, argv);
    return RUN_ALL_TESTS();
}
