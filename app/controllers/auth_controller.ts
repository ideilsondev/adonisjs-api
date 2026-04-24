import type { HttpContext } from '@adonisjs/core/http'
import { registerValidator, loginValidator, updateProfileValidator } from '#validators/auth'
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
    } catch (error: unknown) {
      const code = (error as { code?: string }).code

      // Account exists and password is correct, but the account was deactivated.
      // Because the user already proved knowledge of the correct credentials,
      // it is safe (and helpful) to tell them why access was denied.
      if (code === 'E_ACCOUNT_INACTIVE') {
        this.auditLogger.loginBlocked({ request }, email)
        return response.forbidden({
          error: {
            message: 'Your account has been deactivated. Please contact support.',
            code: 'E_ACCOUNT_INACTIVE',
          },
        })
      }

      // Wrong email or wrong password — keep the message generic to avoid
      // revealing whether the email is registered in the system.
      this.auditLogger.loginFailed({ request }, email, 'invalid_credentials')
      return response.unauthorized({
        error: {
          message: 'Invalid credentials',
          code: 'E_INVALID_CREDENTIALS',
        },
      })
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

  /**
   * Update the authenticated user's own profile.
   *
   * Accepts partial updates (PATCH semantics) — only send what changed.
   * Password change requires currentPassword + newPassword together.
   * On a successful password change every other active token is revoked.
   */
  async update({ auth, request, response }: HttpContext) {
    const user = auth.user!

    const payload = await request.validateUsing(updateProfileValidator, {
      meta: { userId: user.id },
    })

    const updated = await this.authService.updateProfile(user, payload)

    this.auditLogger.log({ request }, 'auth:register', {
      userId: updated.id,
      meta: { action: 'profile_updated' },
    })

    return response.ok({ user: updated })
  }
}
