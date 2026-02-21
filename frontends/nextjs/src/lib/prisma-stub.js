// Stub for .prisma/client — no schema.prisma exists in this project.
// The DBAL client connects to the C++ DBAL server over HTTP in production.
const noop = () => ({})
function PrismaClient() { return { $connect: noop, $disconnect: noop } }
module.exports = { PrismaClient }
module.exports.default = module.exports
module.exports.__esModule = true
