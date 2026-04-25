"use strict";

const hasLicenseKey = Boolean(process.env.NEW_RELIC_LICENSE_KEY);
const explicitlyDisabled = process.env.NEW_RELIC_ENABLED === "false";

exports.config = {
  app_name: [process.env.NEW_RELIC_APP_NAME || "lorito-killer"],
  license_key: process.env.NEW_RELIC_LICENSE_KEY || "",
  agent_enabled: hasLicenseKey && !explicitlyDisabled,
  distributed_tracing: {
    enabled: true,
  },
  logging: {
    level: process.env.NEW_RELIC_LOG_LEVEL || "info",
  },
  allow_all_headers: true,
  attributes: {
    exclude: [
      "request.headers.cookie",
      "request.headers.authorization",
      "request.headers.proxyAuthorization",
      "request.headers.setCookie*",
      "request.headers.x*",
      "response.headers.cookie",
      "response.headers.authorization",
      "response.headers.proxyAuthorization",
      "response.headers.setCookie*",
      "response.headers.x*",
    ],
  },
};
