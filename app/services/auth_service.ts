import User from '#models/user'
import type { Infer } from '@vinejs/vine/types'
import type { registerValidator } from '#validators/auth'

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
   * Uses AdonisJS withAuthFinder mixin which performs a constant-time
   * hash comparison, preventing timing attacks.
   */
  async verifyCredentials(email: string, password: string): Promise<User> {
    return await User.verifyCredentials(email, password)
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
}
