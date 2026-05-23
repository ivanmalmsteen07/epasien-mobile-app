const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Fix for css-tree resolution
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  '../tokenizer': path.resolve(__dirname, 'node_modules/css-tree/lib/tokenizer/index.js'),
};

module.exports = config;
