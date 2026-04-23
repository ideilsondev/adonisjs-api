import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'
const AuthController = () => import('#controllers/auth_controller')

router
  .group(() => {
    router.post('/register', [AuthController, 'register']).use(
      middleware.throttle({
        requests: 3,
        duration: '1 hour',
        blockDuration: '2 hours',
        message: 'Too many registration attempts. Please try again later.',
      })
    )

    router
      .post('/login', [AuthController, 'login'])
      /**
       * Layer 1 — Per-IP limit.
       *
       * Blocks volumetric attacks and credential-stuffing bots that rotate
       * accounts but share a single egress IP (e.g. a single compromised
       * machine testing many email/password combinations).
       *
       * Threshold: 10 attempts per IP per 15 minutes.
       * A legitimate user logging in from one IP on behalf of multiple accounts
       * (e.g. a family) is unlikely to exceed 10 attempts in 15 minutes.
       */
      .use(
        middleware.throttle({
          requests: 10,
          duration: '15 mins',
          blockDuration: '30 mins',
          message: 'Too many login attempts from this IP. Please try again later.',
        })
      )
      /**
       * Layer 2 — Per-account (email) limit.
       *
       * A bot rotating IPs can still be stopped here: each individual account
       * is limited to 5 attempts per 15 minutes regardless of how many IPs
       * are used.  After 5 failures the account key is blocked for 30 minutes,
       * which drastically slows down password-guessing campaigns.
       *
       * The key is derived from the normalised email in the request body.
       * An empty / missing email falls back to the request IP so the middleware
       * never crashes on malformed payloads (validation happens inside the
       * controller, not here).
       */
      .use(
        middleware.throttle({
          requests: 5,
          duration: '15 mins',
          blockDuration: '30 mins',
          message: 'Too many login attempts for this account. Please try again later.',
          key: (ctx) => {
            const body = ctx.request.body() as Record<string, unknown>
            const email = typeof body?.email === 'string' ? body.email.toLowerCase().trim() : null
            return email ? `account:${email}` : `ip:${ctx.request.ip()}`
          },
        })
      )

    router
      .group(() => {
        router.post('/logout', [AuthController, 'logout'])
        router.get('/me', [AuthController, 'me'])
      })
      .use(middleware.auth())
  })
  .prefix('/api/auth')
