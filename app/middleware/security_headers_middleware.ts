import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import app from '@adonisjs/core/services/app'

/**
 * SecurityHeadersMiddleware
 *
 * Adds security-related HTTP response headers that are not covered by the
 * Shield middleware, namely:
 *
 *  - Referrer-Policy          — controls how much referrer info the browser
 *                               includes in outgoing requests.
 *  - Permissions-Policy       — disables browser features the API never needs
 *                               (camera, microphone, geolocation, …).
 *  - Cross-Origin-Opener-Policy  — isolates the browsing context to prevent
 *                               cross-origin window attacks.
 *  - Cross-Origin-Resource-Policy — prevents other origins from loading the
 *                               API responses as sub-resources.
 *  - X-Permitted-Cross-Domain-Policies — blocks Adobe Flash / Acrobat from
 *                               loading cross-domain data.
 *
 * Register this middleware in start/kernel.ts inside the server.use([…]) array
 * so it runs on every request, including unmatched routes:
 *
 *   server.use([
 *     () => import('#middleware/security_headers_middleware'),
 *     …
 *   ])
 */
export default class SecurityHeadersMiddleware {
  handle(ctx: HttpContext, next: NextFn) {
    /**
     * Referrer-Policy
     *
     * "strict-origin-when-cross-origin" is the modern safe default:
     *  - Same-origin requests: full URL as referrer.
     *  - Cross-origin requests over HTTPS → HTTPS: origin only (no path/query).
     *  - Cross-origin requests to HTTP: no referrer at all.
     *
     * This prevents leaking sensitive query parameters or path segments to
     * third-party origins while preserving analytics for same-origin navigation.
     */
    ctx.response.header('Referrer-Policy', 'strict-origin-when-cross-origin')

    /**
     * Permissions-Policy (formerly Feature-Policy)
     *
     * Explicitly disable every browser feature this API does not use.
     * An empty value () means "no origin is allowed to use this feature".
     *
     * Keeping this list exhaustive ensures that even if a bug or a compromised
     * dependency tries to access these APIs, the browser will block it.
     */
    ctx.response.header(
      'Permissions-Policy',
      [
        'accelerometer=()',
        'ambient-light-sensor=()',
        'autoplay=()',
        'battery=()',
        'camera=()',
        'cross-origin-isolated=()',
        'display-capture=()',
        'document-domain=()',
        'encrypted-media=()',
        'execution-while-not-rendered=()',
        'execution-while-out-of-viewport=()',
        'fullscreen=()',
        'geolocation=()',
        'gyroscope=()',
        'keyboard-map=()',
        'magnetometer=()',
        'microphone=()',
        'midi=()',
        'navigation-override=()',
        'payment=()',
        'picture-in-picture=()',
        'publickey-credentials-get=()',
        'screen-wake-lock=()',
        'sync-xhr=()',
        'usb=()',
        'web-share=()',
        'xr-spatial-tracking=()',
      ].join(', ')
    )

    /**
     * Cross-Origin-Opener-Policy (COOP)
     *
     * "same-origin" isolates the browsing context group so cross-origin
     * documents cannot access the window object of this response, preventing
     * Spectre-style cross-origin leaks and popup-based attacks.
     *
     * Use "same-origin-allow-popups" if the app needs to open OAuth pop-ups.
     */
    ctx.response.header('Cross-Origin-Opener-Policy', 'same-origin')

    /**
     * Cross-Origin-Resource-Policy (CORP)
     *
     * "same-origin" prevents other origins from loading this resource as a
     * no-cors sub-resource (e.g. <img src="…">, fetch without CORS headers).
     * The CORS middleware already handles credentialed cross-origin requests,
     * so this header adds a second layer for simple (no-cors) requests.
     */
    ctx.response.header('Cross-Origin-Resource-Policy', 'same-origin')

    /**
     * X-Permitted-Cross-Domain-Policies
     *
     * "none" prevents Adobe Flash, Acrobat, and similar plugins from loading
     * cross-domain policy files, closing an old but still-relevant attack surface.
     */
    ctx.response.header('X-Permitted-Cross-Domain-Policies', 'none')

    /**
     * Remove the X-Powered-By header (fingerprinting reduction).
     *
     * AdonisJS does not set this header by default, but some middleware or
     * reverse proxies might. Explicitly removing it is a defence-in-depth measure.
     */
    ctx.response.removeHeader('X-Powered-By')

    /**
     * In production also set a tighter Content-Security-Policy for the API.
     *
     * Pure JSON APIs have a minimal attack surface, but the header still
     * prevents browsers from interpreting responses as HTML / scripts if
     * something goes wrong (e.g. an error page rendered in a browser tab).
     *
     * Adjust "default-src" if you serve any HTML, images, or scripts directly.
     */
    if (app.inProduction) {
      ctx.response.header(
        'Content-Security-Policy',
        [
          "default-src 'none'",
          "frame-ancestors 'none'",
          'block-all-mixed-content',
          'upgrade-insecure-requests',
        ].join('; ')
      )
    }

    return next()
  }
}
