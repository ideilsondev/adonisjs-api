import type { HttpContext } from '@adonisjs/core/http'
import { registerValidator, loginValidator } from '#validators/auth'
import AuthService from '#services/auth_service'
import AuditLogger from '#services/audit_logger'

import { inject } from '@adonisjs/core'

@inject()
export default class AuthController {
  constructor(
    private authService: AuthService,
    private auditLogger: AuditLogger
  ) {}

  /**
   * Register a new user
   */
  async register({ request, response }: HttpContext) {
    const payload = await request.validateUsing(registerValidator)
    const user = await this.authService.register(payload)

    this.auditLogger.register({ request }, user.id, user.email)

    return response.created({ user })
  }

  /**
   * Login user and issue a token or session
   */
  async login({ request, response, auth }: HttpContext) {
    const { email, password, client } = await request.validateUsing(loginValidator)

    let user
    try {
      user = await this.authService.verifyCredentials(email, password)
    } catch {
      this.auditLogger.loginFailed({ request }, email, 'invalid_credentials')
      // Re-throw so the global exception handler returns the correct status
      throw new Error('Invalid credentials')
    }

    if (client === 'api') {
      const token = await this.authService.generateToken(user)
      if (!token.value) {
        return response.internalServerError({ error: 'Failed to generate token' })
      }

      this.auditLogger.loginSuccess({ request }, user.id, user.email)
      this.auditLogger.tokenCreated({ request }, user.id)

      return response.ok({
        type: 'bearer',
        token: token.value.release(),
      })
    }

    // Default: web session
    await auth.use('web').login(user)
    this.auditLogger.loginSuccess({ request }, user.id, user.email)

    return response.ok({ message: 'Logged in successfully', user })
  }

  /**
   * Logout user
   */
  async logout({ auth, request, response }: HttpContext) {
    if (auth.use('web').isAuthenticated) {
      const user = auth.use('web').user!
      await auth.use('web').logout()
      this.auditLogger.logout({ request }, user.id)
    } else if (auth.use('api').isAuthenticated) {
      const user = auth.use('api').user
      if (user && user.currentAccessToken) {
        await this.authService.revokeToken(
          user,
          user.currentAccessToken.identifier as string | number
        )
        this.auditLogger.tokenRevoked({ request }, user.id)
        this.auditLogger.logout({ request }, user.id)
      }
    }

    return response.ok({ message: 'Logged out successfully' })
  }

  /**
   * Get authenticated user details
   */
  async me({ auth, response }: HttpContext) {
    const user = auth.user
    return response.ok({ user })
  }
}
