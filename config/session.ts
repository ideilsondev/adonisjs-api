import env from '#start/env'
import app from '@adonisjs/core/services/app'
import { defineConfig, stores } from '@adonisjs/session'

const sessionConfig = defineConfig({
  /**
   * Enable or disable session support globally.
   */
  enabled: true,

  /**
   * Cookie name storing the session identifier.
   */
  cookieName: 'sid',

  /**
   * When set to true, the session id cookie will be deleted
   * once the user closes the browser.
   */
  clearWithBrowser: false,

  /**
   * Define how long to keep the session data alive without
   * any activity.
   */
  age: '2h',
  // Note: renaming the cookie from 'adonis-session' to 'sid' avoids
  // exposing which framework powers the backend (fingerprinting reduction).

  /**
   * Configuration for session cookie and the
   * cookie store.
   */
  cookie: {
    /**
     * Restrict the cookie to a URL path. '/' means all routes.
     */
    path: '/',

    /**
     * Prevent JavaScript access to the cookie in the browser.
     */
    httpOnly: true,

    /**
     * Send cookies only over HTTPS in production.
     */
    secure: app.inProduction,

    /**
     * Cross-site policy for cookie sending.
     */
    /**
     * 'strict' is the most secure option: the cookie is never sent on
     * cross-site requests (including top-level navigation from external sites).
     * Use 'lax' only if you need cookies on cross-site GET navigations
     * (e.g., OAuth redirects landing back on your app).
     */
    sameSite: 'strict',
  },

  /**
   * The store to use. Make sure to validate the environment
   * variable in order to infer the store name without any
   * errors.
   */
  store: env.get('SESSION_DRIVER'),

  /**
   * List of configured stores. Refer documentation to see
   * list of available stores and their config.
   */
  stores: {
    cookie: stores.cookie(),
    database: stores.database(),
    redis: stores.redis({ connection: 'main' }),
  },
})

export default sessionConfig
