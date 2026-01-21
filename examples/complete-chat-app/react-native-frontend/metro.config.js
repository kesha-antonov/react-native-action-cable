const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const projectRoot = __dirname
const monorepoRoot = path.resolve(projectRoot, '../../..')

const config = getDefaultConfig(projectRoot)

// Watch the library source
config.watchFolders = [monorepoRoot]

// Resolve modules from both project and monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
]

// Ensure the library is resolved from the monorepo root
config.resolver.extraNodeModules = {
  '@kesha-antonov/react-native-action-cable': monorepoRoot,
}

module.exports = config
