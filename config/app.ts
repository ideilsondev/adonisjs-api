import env from '#start/env'
import app from '@adonisjs/core/services/app'
import { defineConfig } from '@adonisjs/core/http'

/**
 * The app key is used for encrypting cookies, generating signed URLs,
 * and by the "encryption" module.
 *
 * The encryption module will fail to decrypt data if the key is lost or
 * changed. Therefore it is recommended to keep the app key secure.
 */
export const appKey = env.get('APP_KEY')

/**
 * The app URL can be used in various places where you want to create absolute
 * URLs to your application. For example, when sending emails, images should
 * use absolute URLs.
 */
export const appUrl = env.get('APP_URL')

/**
 * The configuration settings used by the HTTP server
 */
export const http = defineConfig({
  /**
   * Trusted proxy configuration.
   *
   * When the app runs behind a reverse proxy (nginx, Caddy, AWS ALB,
   * Cloudflare, etc.) the real client IP arrives in a header like
   * X-Forwarded-For rather than in the TCP connection address.
   *
   * Setting trustProxy correctly ensures that:
   *  - request.ip()          → real client IP (used by rate limiter & audit log)
   *  - request.secure        → true when the original request used HTTPS
   *  - request.hostname      → the original Host header value
   *
   * Options:
   *  false              – trust nobody; use raw TCP address (default for dev).
   *  true               – trust every proxy in the chain (UNSAFE in production;
   *                       allows attackers to spoof IPs via X-Forwarded-For).
   *  'loopback'         – trust 127.0.0.1 and ::1 only (single-server setups).
   *  '10.0.0.0/8'       – trust a specific CIDR range (recommended for AWS VPC,
   *                       Docker networks, etc.).
   *  (addr, hop) => bool – full control; return true only for known proxy IPs.
   *
   * Production recommendation: use the narrowest option that works for your
   * infrastructure — typically the CIDR block of your internal network or the
   * specific IPs of your load balancers.
   */
  trustProxy: app.inProduction
    ? (address: string) => {
        // Trust only RFC-1918 private ranges used by most cloud load balancers.
        // Extend this list to match your actual infrastructure.
        const trustedCidrs = [
          '10.0.0.0/8', // AWS VPC, GCP, Azure private ranges
          '172.16.0.0/12', // Docker / Kubernetes pod networks
          '192.168.0.0/16', // On-prem / local private networks
          '127.0.0.1', // Loopback (nginx on same host)
          '::1', // IPv6 loopback
        ]
        return trustedCidrs.some((cidr) => {
          if (cidr.includes('/')) {
            // Simple CIDR check (covers /8, /12, /16 used above)
            const [base, bits] = cidr.split('/')
            const mask = ~(2 ** (32 - Number(bits)) - 1) >>> 0
            const baseInt = base.split('.').reduce((acc, o) => (acc << 8) | Number(o), 0) >>> 0
            const addrInt = address.split('.').reduce((acc, o) => (acc << 8) | Number(o), 0) >>> 0
            return (addrInt & mask) === (baseInt & mask)
          }
          return address === cidr
        })
      }
    : 'loopback',

  /**
   * Generate a unique request id for each incoming request.
   * Useful to correlate logs and debug a request flow.
   */
  generateRequestId: true,

  /**
   * Allow HTTP method spoofing via the "_method" form/query parameter.
   * This lets HTML forms target PUT/PATCH/DELETE routes while still
   * submitting with POST.
   */
  allowMethodSpoofing: false,

  /**
   * Enabling async local storage will let you access HTTP context
   * from anywhere inside your application.
   */
  useAsyncLocalStorage: false,

  /**
   * Redirect configuration controls the behavior of
   * response.redirect().back() and query string forwarding.
   */
  redirect: {
    /**
     * When enabled, all redirects automatically carry over the current
     * request's query string parameters to the redirect destination.
     * Use withQs(false) to opt out for a specific redirect.
     */
    forwardQueryString: true,
  },

  /**
   * Manage cookies configuration. The settings for the session id cookie are
   * defined inside the "config/session.ts" file.
   */
  cookie: {
    /**
     * Restrict the cookie to a specific domain.
     * Keep empty to use the current host.
     */
    domain: '',

    /**
     * Restrict the cookie to a URL path. '/' means all routes.
     */
    path: '/',

    /**
     * Default lifetime for cookies managed by the HTTP layer.
     */
    maxAge: '2h',

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
    sameSite: 'lax',
  },
})
