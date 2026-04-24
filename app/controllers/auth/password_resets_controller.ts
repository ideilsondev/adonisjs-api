import type { HttpContext } from '@adonisjs/core/http'
import { forgotPasswordValidator, resetPasswordValidator } from '#validators/auth'
import PasswordResetService from '#services/password_reset_service'
import { inject } from '@adonisjs/core'

@inject()
export default class PasswordResetsController {
  constructor(private passwordResetService: PasswordResetService) {}

  /**
   * Request a password reset link.
   * We always return 200 OK even if the email doesn't exist to prevent email enumeration.
   */
  async forgot({ request, response }: HttpContext) {
    const { email } = await request.validateUsing(forgotPasswordValidator)
    
    await this.passwordResetService.sendResetLink(email)

    return response.ok({
      message: 'If the email exists in our system, a password reset link has been sent.',
    })
  }

  /**
   * Reset the password using the token sent via email.
   */
  async reset({ request, response }: HttpContext) {
    const { email, token, newPassword } = await request.validateUsing(resetPasswordValidator)

    await this.passwordResetService.resetPassword(email, token, newPassword)

    return response.ok({
      message: 'Password successfully reset. You can now login with your new password.',
    })
  }
}
