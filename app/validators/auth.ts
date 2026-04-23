import vine from '@vinejs/vine'

/**
 * Validator to validate the payload when registering a new user.
 */
export const registerValidator = vine.compile(
  vine.object({
    fullName: vine.string().trim().minLength(3).maxLength(255).optional(),
    email: vine
      .string()
      .email()
      .trim()
      .normalizeEmail()
      .unique(async (db, value) => {
        const user = await db.from('users').where('email', value).first()
        return !user
      }),
    password: vine.string().minLength(8).maxLength(32),
  })
)

/**
 * Validator to validate the payload when logging in.
 */
export const loginValidator = vine.compile(
  vine.object({
    email: vine.string().email().trim().normalizeEmail(),
    password: vine.string(),
    client: vine.enum(['web', 'api']).optional(),
  })
)
