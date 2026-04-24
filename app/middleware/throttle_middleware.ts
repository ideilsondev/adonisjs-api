import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import app from '@adonisjs/core/services/app'
import limiter from '@adonisjs/limiter/services/main'

/**
 * ThrottleMiddleware — rate-limits incoming requests using @adonisjs/limiter.
 *
 * Strategy: consume() + next()
 *
 * We call consume() BEFORE passing control to the next handler.
 * consume() throws an E_TOO_MANY_REQUESTS (ThrottleException) when the
 * configured limit is exceeded; the global exception handler in
 * app/exceptions/handler.ts catches it and serialises it as a 429 JSON
 * response automatically.
 *
 * Why NOT attempt()?
 * attempt(key, callback) wraps the callback and returns `undefined` when
 * the limit is exceeded. AdonisJS middleware chains return void/undefined,
 * so attempt() can never distinguish "limit exceeded" from "handler returned
 * nothing" — every request would be treated as throttled. consume() + next()
 * avoids this ambiguity entirely.
 *
 * @example
 * // In start/routes/auth.ts
 * router.post('/login', [AuthController, 'login']).use(
 *   middleware.throttle({
 *     requests: 5,
 *     duration: '15 mins',
 *     blockDuration: '30 mins',
 *     message: 'Too many login attempts. Please try again later.',
 *   })
 * )
 */
export default class ThrottleMiddleware {
  async handle(
    ctx: HttpContext,
    next: NextFn,
    options: {
      /**
       * Maximum number of requests allowed within the duration window.
       * @default 60
       */
      requests?: number

      /**
       * Time window in which `requests` are counted.
       * Accepts human-readable strings: '1 min', '15 mins', '1 hour', etc.
       * @default '1 min'
       */
      duration?: string

      /**
       * How long to block further requests once the limit is hit.
       * Accepts the same format as `duration`.
       * @default '5 mins'
       */
      blockDuration?: string

      /**
       * Custom key factory.  Receives the full HttpContext so you can derive
       * the key from the request body, authenticated user, etc.
       * Defaults to the client IP address.
       *
       * @example
       * // Rate-limit by email (account-level throttle)
       * key: (ctx) => {
       *   const body = ctx.request.body() as Record<string, unknown>
       *   const email = typeof body?.email === 'string' ? body.email.toLowerCase().trim() : null
       *   return email ? `account:${email}` : `ip:${ctx.request.ip()}`
       * }
       */
      key?: (ctx: HttpContext) => string

      /**
       * Human-readable message returned to the client when the limit is exceeded.
       * @default 'Too many requests. Please try again later.'
       */
      message?: string
    } = {}
  ) {
    const {
      requests = 60,
      duration = '1 min',
      blockDuration = '5 mins',
      key,
      message = 'Too many requests. Please try again later.',
    } = options

    // ── 0. Skip in development and test environments ────────────────────────
    //
    // Development: the server is only reachable locally, so rate limiting
    // adds friction with no security benefit. It also avoids requiring a
    // running Redis instance just to hit a single endpoint.
    //
    // Test: the memory store accumulates state across tests within the same
    // process. Since tests call the same endpoints multiple times (e.g. three
    // register attempts to validate different validation rules), they would
    // exhaust the low per-test limits and return 429 instead of the expected
    // 422/201. Skipping here keeps tests fast and deterministic; rate limiting
    // is still exercised by dedicated rate-limit test cases if needed.
    if (app.inDev || app.inTest) {
      return next()
    }

    // ── 1. Determine the unique client key ─────────────────────────────────
    const identifier = key ? key(ctx) : `ip:${ctx.request.ip()}`

    // ── 2. Build limiter with the requested consumption options ────────────
    const rateLimiter = limiter.use({ requests, duration, blockDuration })

    // ── 3. Try to consume one request token ────────────────────────────────
    //
    // consume() decrements the remaining counter for `identifier`.
    // When the counter reaches 0 it throws ThrottleException (status 429).
    // ThrottleException is handled by AdonisJS's global exception handler
    // which automatically sets the correct HTTP status and Retry-After header.
    //
    // On success we obtain the limiter response and add informational headers
    // so API clients can self-throttle gracefully.
    let limiterInfo: Awaited<ReturnType<typeof rateLimiter.consume>>

    try {
      limiterInfo = await rateLimiter.consume(identifier)
    } catch (error: unknown) {
      // Re-throw ThrottleException so the global handler converts it to 429.
      // Attach the custom message if the caller provided one.
      if (
        error !== null &&
        typeof error === 'object' &&
        'code' in error &&
        (error as { code: string }).code === 'E_TOO_MANY_REQUESTS'
      ) {
        const throttleError = error as {
          code: string
          message: string
          status: number
          response?: { availableIn: number; limit: number; remaining: number }
        }
        // Override the generic message with the route-specific one
        throttleError.message = message

        // Add standard rate-limit headers before rethrowing
        if (throttleError.response) {
          ctx.response.header('X-RateLimit-Limit', throttleError.response.limit)
          ctx.response.header('X-RateLimit-Remaining', 0)
          ctx.response.header('Retry-After', throttleError.response.availableIn)
          ctx.response.header(
            'X-RateLimit-Reset',
            new Date(Date.now() + throttleError.response.availableIn * 1000).toISOString()
          )
        }
      }
      throw error
    }

    // ── 4. Request is within limits — add informational headers ────────────
    ctx.response.header('X-RateLimit-Limit', limiterInfo.limit)
    ctx.response.header('X-RateLimit-Remaining', limiterInfo.remaining)

    // ── 5. Hand off to the next middleware / route handler ─────────────────
    return next()
  }
}
