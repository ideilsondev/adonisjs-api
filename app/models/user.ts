import { UserSchema } from '#database/schema'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { type AccessToken, DbAccessTokensProvider } from '@adonisjs/auth/access_tokens'
import { column } from '@adonisjs/lucid/orm'

/**
 * All privilege levels available in the system.
 *
 * - user  — standard account, created by default on registration.
 * - admin — full access; only assignable via seed or direct DB update.
 *
 * Add new roles here and create a new migration that extends the Postgres
 * `user_role` enum type before using them.
 */
export type UserRole = 'admin' | 'user'

export default class User extends compose(UserSchema, withAuthFinder(hash)) {
  static accessTokens = DbAccessTokensProvider.forModel(User)
  declare currentAccessToken?: AccessToken

  /**
   * Override the `any` type emitted by the schema generator for native
   * Postgres enum columns.  The generator cannot infer the union type on its
   * own; we re-declare the column with the correct TypeScript type here.
   */
  @column()
  declare role: UserRole

  @column()
  declare isSuper: boolean

  @column()
  declare avatarUrl: string | null

  @column()
  declare phone: string | null

  @column()
  declare timezone: string

  @column()
  declare locale: string

  @column()
  declare metadata: Record<string, any> | null

  @column()
  declare tenantId: number | null

  @column.dateTime()
  declare deletedAt: DateTime | null

  get initials() {
    const [first, last] = this.name ? this.name.split(' ') : this.email.split('@')
    if (first && last) {
      return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
    }
    return `${first.slice(0, 2)}`.toUpperCase()
  }
}
