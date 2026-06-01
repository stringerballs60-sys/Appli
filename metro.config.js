const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Hermes ne supporte pas les dynamic imports avec variable (ex: import(OTEL_PKG))
// présents dans @supabase/realtime-js >= 2.x via @opentelemetry
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
