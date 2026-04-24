import { Exception } from '@adonisjs/core/exceptions'
import hash from '@adonisjs/core/services/hash'
import db from '@adonisjs/lucid/services/db'
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'
import crypto from 'node:crypto'
import User from '#models/user'
import AuthService from '#services/auth_service'
import { inject } from '@adonisjs/core'

@inject()
export default class PasswordResetService {
  constructor(private authService: AuthService) {}

  /**
   * Generates a reset token and "sends" it via email (mocked).
   */
  async sendResetLink(email: string) {
    const user = await User.findBy('email', email)
    if (!user || !user.active) {
      // Security: we do not throw an error to prevent email enumeration.
      logger.info(`Password reset requested for non-existent or inactive email: ${email}`)
      return
    }

    // Delete existing tokens for this email
    await db.from('password_reset_tokens').where('email', email).delete()

    // Generate plain token
    const plainToken = crypto.randomBytes(32).toString('hex')
    
    // Hash token for storage
    const hashedToken = await hash.make(plainToken)

    // Store in DB
    await db.table('password_reset_tokens').insert({
      email,
      token: hashedToken,
      expires_at: DateTime.now().plus({ hours: 1 }).toJSDate(),
      created_at: DateTime.now().toJSDate(),
    })

    // Mock sending email
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${plainToken}&email=${encodeURIComponent(email)}`
    
    logger.info(`[MOCK EMAIL] Password reset requested for ${email}.`)
    logger.info(`[MOCK EMAIL] Click here to reset: ${resetLink}`)
  }

  /**
   * Validates the token and sets a new password.
   */
  async resetPassword(email: string, plainToken: string, newPassword: string) {
    const record = await db.from('password_reset_tokens').where('email', email).first()

    if (!record) {
      throw new Exception('Invalid or expired password reset token.', {
        status: 400,
        code: 'E_INVALID_RESET_TOKEN',
      })
    }

    // Check expiration
    if (DateTime.now() > DateTime.fromJSDate(record.expires_at)) {
      await db.from('password_reset_tokens').where('email', email).delete()
      throw new Exception('Invalid or expired password reset token.', {
        status: 400,
        code: 'E_INVALID_RESET_TOKEN',
      })
    }

    // Verify token
    const isValid = await hash.verify(record.token, plainToken)
    if (!isValid) {
      throw new Exception('Invalid or expired password reset token.', {
        status: 400,
        code: 'E_INVALID_RESET_TOKEN',
      })
    }

    // Find user
    const user = await User.findBy('email', email)
    if (!user || !user.active) {
      throw new Exception('Account not found or inactive.', {
        status: 400,
        code: 'E_ACCOUNT_INACTIVE',
      })
    }

    // Update password
    user.password = newPassword
    await user.save()

    // Revoke all tokens
    await this.authService.revokeAllTokens(user)

    // Cleanup the reset token
    await db.from('password_reset_tokens').where('email', email).delete()
  }
}
