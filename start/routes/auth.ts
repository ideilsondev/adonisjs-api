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

      .use(
        middleware.throttle({
          requests: 10,
          duration: '15 mins',
          blockDuration: '30 mins',
          message: 'Too many login attempts from this IP. Please try again later.',
        })
      )

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
