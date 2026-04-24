import User from '#models/user'
import { Exception } from '@adonisjs/core/exceptions'
import hash from '@adonisjs/core/services/hash'
import type { Infer } from '@vinejs/vine/types'
import type { registerValidator, updateProfileValidator } from '#validators/auth'

/**
 * Token expiration presets.
 * Choose the one that fits the use case - short-lived tokens are safer.
 */
const TOKEN_EXPIRY = {
  /** Standard API token: 30 days */
  default: '30 days',
  /** Short-lived token for sensitive apps */
  short: '24 hours',
  /** Long-lived token for trusted devices / remember-me */
  long: '90 days',
} as const

export default class AuthService {
  /**
   * Register a new user
   */
  async register(payload: Infer<typeof registerValidator>) {
    return await User.create(payload)
  }

  /**
   * Verify user credentials.
   *
   * Steps:
   *  1. Delegates to withAuthFinder mixin which performs a constant-time
   *     hash comparison, preventing timing attacks.
   *  2. After a successful credential check, ensures the account is active.
   *     Inactive accounts receive the same 401 response as wrong credentials
   *     so we don't leak whether the email exists in the system.
   */
  async verifyCredentials(email: string, password: string): Promise<User> {
    const user = await User.verifyCredentials(email, password)

    if (!user.active) {
      throw new Exception('Your account has been deactivated. Please contact support.', {
        status: 403,
        code: 'E_ACCOUNT_INACTIVE',
      })
    }

    return user
  }

  /**
   * Generate a signed API access token for a user.
   *
   * Tokens are stored hashed in the database; only the raw value is
   * returned once and must be forwarded to the client immediately.
   *
   * @param user    - The authenticated user
   * @param expiry  - Token lifetime preset (default: 30 days)
   * @param name    - Optional label shown in token management UIs
   */
  async generateToken(user: User, expiry: keyof typeof TOKEN_EXPIRY = 'default', name?: string) {
    return await User.accessTokens.create(user, ['*'], {
      name: name ?? 'API Token',
      expiresIn: TOKEN_EXPIRY[expiry],
    })
  }

  /**
   * Revoke a single access token by its identifier.
   *
   * Should be called on logout for API clients.
   */
  async revokeToken(user: User, identifier: number | string) {
    await User.accessTokens.delete(user, identifier)
  }

  /**
   * Revoke ALL access tokens belonging to a user.
   *
   * Use this after a password change or when a security breach is suspected,
   * to invalidate every active session across all devices.
   */
  async revokeAllTokens(user: User) {
    const tokens = await User.accessTokens.all(user)
    await Promise.all(tokens.map((token) => User.accessTokens.delete(user, token.identifier)))
  }

  /**
   * Update the authenticated user's own profile.
   *
   * Only the fields present in the payload are updated (PATCH semantics).
   * Password change flow:
   *  - Requires `currentPassword` to confirm identity before accepting `newPassword`.
   *  - After a successful password change ALL existing tokens are revoked so every
   *    other active session is forced to re-authenticate.
   *
   * @returns The updated user instance.
   * @throws 401 when `currentPassword` is provided but does not match.
   */
  async updateProfile(user: User, payload: Infer<typeof updateProfileValidator>): Promise<User> {
    const { name, email, currentPassword, newPassword } = payload

    if (name !== undefined) user.name = name
    if (email !== undefined) user.email = email

    if (newPassword !== undefined) {
      // currentPassword is required to change the password
      if (!currentPassword) {
        throw new Exception('Current password is required to set a new password.', {
          status: 422,
          code: 'E_MISSING_CURRENT_PASSWORD',
        })
      }

      const valid = await hash.verify(user.password, currentPassword)
      if (!valid) {
        throw new Exception('Current password is incorrect.', {
          status: 401,
          code: 'E_INVALID_CURRENT_PASSWORD',
        })
      }

      user.password = newPassword

      await user.save()

      // Invalidate every session so stolen tokens can no longer be used
      await this.revokeAllTokens(user)

      return user
    }

    await user.save()
    return user
  }
}
