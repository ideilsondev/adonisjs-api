import app from '@adonisjs/core/services/app'
import env from '#start/env'
import { defineConfig } from '@adonisjs/cors'

/**
 * Parse the CORS_ALLOWED_ORIGINS environment variable into an array of strings.
 *
 * Expected format: a comma-separated list of fully-qualified origins.
 * Example: "https://app.example.com,https://admin.example.com"
 *
 * Returns an empty array (block all) when the variable is not set.
 */
function parseAllowedOrigins(): string[] {
  const raw = env.get('CORS_ALLOWED_ORIGINS')
  if (!raw) return []
  return raw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
}

/**
 * Configuration options to tweak the CORS policy. The following
 * options are documented on the official documentation website.
 *
 * https://docs.adonisjs.com/guides/security/cors
 */
const corsConfig = defineConfig({
  /**
   * Enable or disable CORS handling globally.
   */
  enabled: true,

  /**
   * Origin policy:
   *  - Development  → allow every origin so the local frontend works without
   *                   extra configuration.
   *  - Production   → read the whitelist from CORS_ALLOWED_ORIGINS.
   *                   If the variable is empty / unset, all cross-origin
   *                   requests are blocked (safest default).
   *
   * Set CORS_ALLOWED_ORIGINS in your production .env:
   *   CORS_ALLOWED_ORIGINS=https://app.example.com,https://admin.example.com
   */
  origin: app.inDev ? true : parseAllowedOrigins(),

  /**
   * HTTP methods accepted for cross-origin requests.
   */
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'],

  /**
   * Reflect request headers by default. Use a string array to restrict
   * allowed headers.
   */
  headers: true,

  /**
   * Response headers exposed to the browser.
   */
  exposeHeaders: [],

  /**
   * Allow cookies / Authorization headers on cross-origin requests.
   * Required when the web guard sends the session cookie cross-origin.
   */
  credentials: true,

  /**
   * Cache CORS preflight response for N seconds.
   */
  maxAge: 90,
})

export default corsConfig
