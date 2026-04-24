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
  async login(ctx: HttpContext) {
    const payload = await ctx.request.validateUsing(loginValidator)
    const result = await this.authService.attemptLogin(ctx, payload)
    return ctx.response.ok(result)
  }

  /**
   * Logout user
   */
  async logout(ctx: HttpContext) {
    await this.authService.attemptLogout(ctx)
    return ctx.response.ok({ message: 'Logged out successfully' })
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
