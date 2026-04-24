import vine from '@vinejs/vine'

/**
 * Common passwords that should be rejected
 * This is a minimal list - consider using a comprehensive password dictionary
 */
const COMMON_PASSWORDS = [
  'password',
  'password123',
  '12345678',
  'qwerty',
  'abc123',
  'letmein',
  'welcome',
  'monkey',
  'dragon',
  'master',
  '123456789',
  'iloveyou',
]

/**
 * Custom validation rule to check password strength
 */
const strongPassword = vine.createRule(async (value, _options, field) => {
  if (typeof value !== 'string') {
    return
  }

  const errors: string[] = []

  // Check for at least one lowercase letter
  if (!/[a-z]/.test(value)) {
    errors.push('at least one lowercase letter')
  }

  // Check for at least one uppercase letter
  if (!/[A-Z]/.test(value)) {
    errors.push('at least one uppercase letter')
  }

  // Check for at least one number
  if (!/\d/.test(value)) {
    errors.push('at least one number')
  }

  // Check for at least one special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value)) {
    errors.push('at least one special character (!@#$%^&*...)')
  }

  // Check if password is too common
  if (COMMON_PASSWORDS.includes(value.toLowerCase())) {
    field.report(
      'The password is too common. Please choose a stronger password.',
      'strongPassword',
      field
    )
    return
  }

  // Report all validation errors at once
  if (errors.length > 0) {
    const message = `Password must contain ${errors.join(', ')}`
    field.report(message, 'strongPassword', field)
  }
})

/**
 * Validator to validate the payload when registering a new user.
 *
 * Note: `role` is intentionally absent.
 * Public registration always creates a standard `user` account.
 * The `admin` role can only be assigned via the database seeder or a
 * direct DB update — never through the HTTP API.
 */
export const registerValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(255).optional(),
    email: vine
      .string()
      .email()
      .trim()
      .normalizeEmail()
      .unique(async (db, value) => {
        const user = await db.from('users').where('email', value).first()
        return !user
      }),
    password: vine.string().minLength(8).maxLength(128).use(strongPassword()),
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

/**
 * Validator for updating the authenticated user's own profile.
 *
 * Rules:
 *  - All fields are optional — clients can send only what changed (PATCH semantics).
 *  - Email uniqueness is checked excluding the current user's own email so that
 *    re-submitting the same email doesn't fail validation.
 *  - Password change requires the current password for confirmation.
 *  - New password follows the same strength rules as registration.
 *
 * Note: `role` and `active` are intentionally absent.
 * Users cannot promote themselves or deactivate their own account through this
 * endpoint.  Those fields are managed exclusively by admin operations.
 */
export const updateProfileValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(255).optional(),

    email: vine
      .string()
      .email()
      .trim()
      .normalizeEmail()
      .unique(async (db, value, field) => {
        // Allow the user to keep their current email
        const userId = (field.meta as { userId?: number }).userId
        const query = db.from('users').where('email', value)
        if (userId) query.whereNot('id', userId)
        const row = await query.first()
        return !row
      })
      .optional(),

    /**
     * Changing the password requires confirming the current one first.
     * Both fields must be present together.
     */
    currentPassword: vine.string().optional(),
    newPassword: vine.string().minLength(8).maxLength(128).use(strongPassword()).optional(),
  })
)
