import type { HttpContext } from '@adonisjs/core/http'
import { registerValidator, loginValidator } from '#validators/auth'
import AuthService from '#services/auth_service'
import User from '#models/user'
import { inject } from '@adonisjs/core'

@inject()
export default class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * Register a new user
   */
  async register({ request, response }: HttpContext) {
    const payload = await request.validateUsing(registerValidator)
    const user = await this.authService.register(payload)

    // Optional: Auto-login after registration
    // We'll return 201 for now, client can login later or we can auth here.
    return response.created({ user })
  }

  /**
   * Login user and issue a token or session
   */
  async login({ request, response, auth }: HttpContext) {
    const { email, password, client } = await request.validateUsing(loginValidator)
    const user = await this.authService.verifyCredentials(email, password)

    if (client === 'api') {
      const token = await this.authService.generateToken(user)
      return response.ok({
        type: 'bearer',
        token: token.value!.release(),
      })
    }

    // Default to web session
    await auth.use('web').login(user)
    return response.ok({ message: 'Logged in successfully', user })
  }

  /**
   * Logout user
   */
  async logout({ auth, response }: HttpContext) {
    if (auth.use('web').isAuthenticated) {
      await auth.use('web').logout()
    } else if (auth.use('api').isAuthenticated) {
      const user = auth.use('api').user!
      await User.accessTokens.delete(user, user.currentAccessToken.identifier)
    }

    return response.ok({ message: 'Logged out successfully' })
  }

  /**
   * Get authenticated user details
   */
  async me({ auth, response }: HttpContext) {
    // Determine which guard is authenticated (api or web)
    const user = auth.user
    return response.ok({ user })
  }
}
