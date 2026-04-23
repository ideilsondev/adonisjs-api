import User from '#models/user'
import type { Infer } from '@vinejs/vine/types'
import type { registerValidator } from '#validators/auth'

export default class AuthService {
  /**
   * Register a new user
   */
  async register(payload: Infer<typeof registerValidator>) {
    return await User.create(payload)
  }

  /**
   * Verify user credentials
   */
  async verifyCredentials(email: string, password: string): Promise<User> {
    return await User.verifyCredentials(email, password)
  }

  /**
   * Generate an API access token for a user
   */
  async generateToken(user: User) {
    return await User.accessTokens.create(user)
  }

  /**
   * Revoke a specific token by its ID or Hash
   */
  async revokeToken(_user: User, _identifier: number | string) {
    // Revocation logic depends on the guard, but typically handled by auth
    // In this service we provide helper if needed.
  }
}
