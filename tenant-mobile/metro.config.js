const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add support for handling ESM packages that use .mjs or rely on explicit extensions
// Specifically fixes `socket.io-client` / `engine.io-parser` issues in React Native
config.resolver.sourceExts.push('mjs', 'cjs');

module.exports = config;
