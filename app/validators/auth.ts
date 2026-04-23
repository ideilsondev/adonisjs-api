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
