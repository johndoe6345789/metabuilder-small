cmake_minimum_required(VERSION 3.20)
project(dbal_daemon CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Find Conan-provided packages
find_package(Drogon REQUIRED)
find_package(nlohmann_json REQUIRED)
find_package(yaml-cpp REQUIRED)
find_package(spdlog REQUIRED)
find_package(fmt REQUIRED)
find_package(SQLite3 REQUIRED)
find_package(cpr REQUIRED)
find_package(inja REQUIRED)
find_package(mongocxx REQUIRED)
find_package(bsoncxx REQUIRED)
find_package(Boost REQUIRED)
find_package(GTest REQUIRED)

# Glob all source files
file(GLOB_RECURSE DBAL_SOURCES
    "${CMAKE_CURRENT_SOURCE_DIR}/src/*.cpp"
)

# Glob all headers
file(GLOB_RECURSE DBAL_HEADERS
    "${CMAKE_CURRENT_SOURCE_DIR}/src/*.hpp"
    "${CMAKE_CURRENT_SOURCE_DIR}/include/*.hpp"
)

add_executable(dbal_daemon ${DBAL_SOURCES} ${DBAL_HEADERS})

target_include_directories(dbal_daemon PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/src
    ${CMAKE_CURRENT_SOURCE_DIR}/src/daemon
    ${CMAKE_CURRENT_SOURCE_DIR}/src/core
    ${CMAKE_CURRENT_SOURCE_DIR}/src/adapters
    ${CMAKE_CURRENT_SOURCE_DIR}/include
    ${CMAKE_CURRENT_SOURCE_DIR}/include/dbal
)

target_link_libraries(dbal_daemon PRIVATE
    Drogon::Drogon
    nlohmann_json::nlohmann_json
    yaml-cpp::yaml-cpp
    spdlog::spdlog
    fmt::fmt
    SQLite::SQLite3
    cpr::cpr
    pantor::inja
    mongo::mongocxx_shared
    mongo::bsoncxx_shared
    Boost::boost
)

install(TARGETS dbal_daemon DESTINATION bin)
