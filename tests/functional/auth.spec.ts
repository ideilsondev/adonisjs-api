import { test } from '@japa/runner'
import type { ApiClient } from '@japa/api-client'
import User from '#models/user'
import type { UserRole } from '#models/user'
import testUtils from '@adonisjs/core/services/test_utils'

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Login and return a Bearer token for use in subsequent requests. */
async function loginAsApi(client: ApiClient, email: string, password: string): Promise<string> {
  const res = await client.post('/api/auth/login').json({ email, password, client: 'api' })
  return (res.body() as { token: string }).token
}

/** Shorthand to create a minimal active user. */
async function createUser(
  overrides: Partial<{
    name: string
    email: string
    password: string
    active: boolean
    role: UserRole
  }> = {}
) {
  return User.create({
    name: overrides.name ?? 'Test User',
    email: overrides.email ?? 'user@example.com',
    password: overrides.password ?? 'Test@Pass123',
    active: overrides.active ?? true,
    role: overrides.role ?? 'user',
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Register
// ─────────────────────────────────────────────────────────────────────────────

test.group('Auth / Register', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('creates user and returns 201 with name', async ({ client, assert }) => {
    const response = await client.post('/api/auth/register').json({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'Test@Pass123',
    })

    response.assertStatus(201)
    response.assertBodyContains({ user: { email: 'john@example.com', name: 'John Doe' } })

    // persisted correctly
    const user = await User.findBy('email', 'john@example.com')
    assert.isNotNull(user)
    assert.isTrue(user!.active)
    // public registration always creates a standard user, never an admin
    assert.equal(user!.role, 'user')
  })

  test('registration never accepts a role field — always defaults to user', async ({
    client,
    assert,
  }) => {
    const response = await client.post('/api/auth/register').json({
      name: 'Sneaky User',
      email: 'sneaky@example.com',
      password: 'Test@Pass123',
      // attempt to self-promote — must be silently ignored
      role: 'admin',
    })

    response.assertStatus(201)

    const user = await User.findBy('email', 'sneaky@example.com')
    assert.equal(user!.role, 'user')
  })

  test('name is optional — registers without it', async ({ client }) => {
    const response = await client.post('/api/auth/register').json({
      email: 'noname@example.com',
      password: 'Test@Pass123',
    })

    response.assertStatus(201)
    response.assertBodyContains({ user: { email: 'noname@example.com' } })
  })

  test('fails with 422 when email is already taken', async ({ client }) => {
    await createUser({ email: 'taken@example.com' })

    const response = await client.post('/api/auth/register').json({
      name: 'Clone',
      email: 'taken@example.com',
      password: 'Test@Pass123',
    })

    response.assertStatus(422)
  })

  test('fails with 422 when password is too weak (no uppercase)', async ({ client }) => {
    const response = await client.post('/api/auth/register').json({
      email: 'weak@example.com',
      password: 'test@pass123',
    })

    response.assertStatus(422)
  })

  test('fails with 422 when password is a common password', async ({ client }) => {
    const response = await client.post('/api/auth/register').json({
      email: 'common@example.com',
      password: 'password123',
    })

    response.assertStatus(422)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Login
// ─────────────────────────────────────────────────────────────────────────────

test.group('Auth / Login', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('api client receives bearer token', async ({ client, assert }) => {
    await createUser({ email: 'api@example.com' })

    const response = await client.post('/api/auth/login').json({
      email: 'api@example.com',
      password: 'Test@Pass123',
      client: 'api',
    })

    response.assertStatus(200)
    const body = response.body() as { token?: string; type?: string }
    assert.equal(body.type, 'bearer')
    assert.exists(body.token)
  })

  test('web client receives session cookie', async ({ client }) => {
    await createUser({ email: 'web@example.com' })

    const response = await client.post('/api/auth/login').json({
      email: 'web@example.com',
      password: 'Test@Pass123',
      client: 'web',
    })

    response.assertStatus(200)
    response.assertCookie('sid')
  })

  test('fails with 401 when password is wrong', async ({ client }) => {
    await createUser({ email: 'wrong@example.com' })

    const response = await client.post('/api/auth/login').json({
      email: 'wrong@example.com',
      password: 'Wrong@Pass999',
      client: 'api',
    })

    response.assertStatus(401)
  })

  test('fails with 403 and E_ACCOUNT_INACTIVE when account is inactive', async ({
    client,
    assert,
  }) => {
    await createUser({ email: 'inactive@example.com', active: false })

    const response = await client.post('/api/auth/login').json({
      email: 'inactive@example.com',
      password: 'Test@Pass123',
      client: 'api',
    })

    response.assertStatus(403)
    const body = response.body() as unknown as { error: { code: string; message: string } }
    assert.equal(body.error.code, 'E_ACCOUNT_INACTIVE')
    assert.include(body.error.message, 'deactivated')
  })

  test('wrong password returns 401, inactive account returns 403 (different responses)', async ({
    client,
    assert,
  }) => {
    await createUser({ email: 'diff@example.com', active: false })

    const [wrongPass, inactive] = await Promise.all([
      client.post('/api/auth/login').json({
        email: 'diff@example.com',
        password: 'Wrong@Pass999',
        client: 'api',
      }),
      client.post('/api/auth/login').json({
        email: 'diff@example.com',
        password: 'Test@Pass123',
        client: 'api',
      }),
    ])

    // Wrong password → 401 (does not reveal whether email exists)
    assert.equal(wrongPass.status(), 401)
    const wrongBody = wrongPass.body() as unknown as { error: { code: string } }
    assert.equal(wrongBody.error.code, 'E_INVALID_CREDENTIALS')

    // Correct password but inactive → 403 (safe to be specific: user proved they own the account)
    assert.equal(inactive.status(), 403)
    const inactiveBody = inactive.body() as unknown as { error: { code: string } }
    assert.equal(inactiveBody.error.code, 'E_ACCOUNT_INACTIVE')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Roles
// ─────────────────────────────────────────────────────────────────────────────

test.group('Auth / Roles', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('regular user has role "user" in /me response', async ({ client }) => {
    await createUser({ email: 'regular@example.com', role: 'user' })
    const token = await loginAsApi(client, 'regular@example.com', 'Test@Pass123')

    const response = await client.get('/api/auth/me').header('Authorization', `Bearer ${token}`)

    response.assertStatus(200)
    response.assertBodyContains({ user: { role: 'user' } })
  })

  test('admin user has role "admin" in /me response', async ({ client }) => {
    await createUser({ email: 'admin@example.com', role: 'admin' })
    const token = await loginAsApi(client, 'admin@example.com', 'Test@Pass123')

    const response = await client.get('/api/auth/me').header('Authorization', `Bearer ${token}`)

    response.assertStatus(200)
    response.assertBodyContains({ user: { role: 'admin' } })
  })

  test('user cannot change own role via PATCH /me', async ({ client, assert }) => {
    await createUser({ email: 'norole@example.com', role: 'user' })
    const token = await loginAsApi(client, 'norole@example.com', 'Test@Pass123')

    // send role in the body — must be ignored
    const response = await client
      .patch('/api/auth/me')
      .header('Authorization', `Bearer ${token}`)
      .json({ role: 'admin' })

    response.assertStatus(200)

    // role must remain 'user' in the database
    const user = await User.findBy('email', 'norole@example.com')
    assert.equal(user!.role, 'user')
  })

  test('admin can still login normally', async ({ client, assert }) => {
    await createUser({ email: 'adminlogin@example.com', role: 'admin' })

    const response = await client.post('/api/auth/login').json({
      email: 'adminlogin@example.com',
      password: 'Test@Pass123',
      client: 'api',
    })

    response.assertStatus(200)
    const body = response.body() as unknown as { type: string; token: string }
    assert.equal(body.type, 'bearer')
    assert.exists(body.token)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Logout
// ─────────────────────────────────────────────────────────────────────────────

test.group('Auth / Logout', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('api token is revoked on logout', async ({ client }) => {
    await createUser({ email: 'logout@example.com' })
    const token = await loginAsApi(client, 'logout@example.com', 'Test@Pass123')

    const logout = await client.post('/api/auth/logout').header('Authorization', `Bearer ${token}`)

    logout.assertStatus(200)

    // Token must no longer work
    const me = await client.get('/api/auth/me').header('Authorization', `Bearer ${token}`)
    me.assertStatus(401)
  })

  test('returns 401 when not authenticated', async ({ client }) => {
    const response = await client.post('/api/auth/logout')
    response.assertStatus(401)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /me
// ─────────────────────────────────────────────────────────────────────────────

test.group('Auth / Me', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('returns authenticated user data', async ({ client }) => {
    await createUser({ name: 'Jane Doe', email: 'jane@example.com' })
    const token = await loginAsApi(client, 'jane@example.com', 'Test@Pass123')

    const response = await client.get('/api/auth/me').header('Authorization', `Bearer ${token}`)

    response.assertStatus(200)
    response.assertBodyContains({ user: { email: 'jane@example.com', name: 'Jane Doe' } })
  })

  test('password is never exposed in the response', async ({ client, assert }) => {
    await createUser({ email: 'nopwd@example.com' })
    const token = await loginAsApi(client, 'nopwd@example.com', 'Test@Pass123')

    const response = await client.get('/api/auth/me').header('Authorization', `Bearer ${token}`)

    const body = response.body() as unknown as { user: Record<string, unknown> }
    assert.notProperty(body.user, 'password')
  })

  test('returns 401 when unauthenticated', async ({ client }) => {
    const response = await client.get('/api/auth/me')
    response.assertStatus(401)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /me — Update profile
// ─────────────────────────────────────────────────────────────────────────────

test.group('Auth / Update Profile', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('updates name', async ({ client }) => {
    await createUser({ name: 'Old Name', email: 'upd@example.com' })
    const token = await loginAsApi(client, 'upd@example.com', 'Test@Pass123')

    const response = await client
      .patch('/api/auth/me')
      .header('Authorization', `Bearer ${token}`)
      .json({ name: 'New Name' })

    response.assertStatus(200)
    response.assertBodyContains({ user: { name: 'New Name' } })
  })

  test('updates email', async ({ client }) => {
    await createUser({ email: 'before@example.com' })
    const token = await loginAsApi(client, 'before@example.com', 'Test@Pass123')

    const response = await client
      .patch('/api/auth/me')
      .header('Authorization', `Bearer ${token}`)
      .json({ email: 'after@example.com' })

    response.assertStatus(200)
    response.assertBodyContains({ user: { email: 'after@example.com' } })
  })

  test('allows re-submitting the same email (no false uniqueness error)', async ({ client }) => {
    await createUser({ email: 'same@example.com' })
    const token = await loginAsApi(client, 'same@example.com', 'Test@Pass123')

    const response = await client
      .patch('/api/auth/me')
      .header('Authorization', `Bearer ${token}`)
      .json({ email: 'same@example.com' })

    response.assertStatus(200)
  })

  test('fails with 422 when email is already used by another account', async ({ client }) => {
    await createUser({ email: 'taken@example.com' })
    await createUser({ email: 'me@example.com' })
    const token = await loginAsApi(client, 'me@example.com', 'Test@Pass123')

    const response = await client
      .patch('/api/auth/me')
      .header('Authorization', `Bearer ${token}`)
      .json({ email: 'taken@example.com' })

    response.assertStatus(422)
  })

  test('changes password with correct currentPassword', async ({ client }) => {
    await createUser({ email: 'pwd@example.com' })
    const token = await loginAsApi(client, 'pwd@example.com', 'Test@Pass123')

    const response = await client
      .patch('/api/auth/me')
      .header('Authorization', `Bearer ${token}`)
      .json({ currentPassword: 'Test@Pass123', newPassword: 'New@Pass456' })

    response.assertStatus(200)
  })

  test('password change revokes all other tokens', async ({ client }) => {
    await createUser({ email: 'revoke@example.com' })

    // Obtain two separate tokens
    const tokenA = await loginAsApi(client, 'revoke@example.com', 'Test@Pass123')
    const tokenB = await loginAsApi(client, 'revoke@example.com', 'Test@Pass123')

    // Change password using tokenA
    await client
      .patch('/api/auth/me')
      .header('Authorization', `Bearer ${tokenA}`)
      .json({ currentPassword: 'Test@Pass123', newPassword: 'New@Pass456' })

    // Both tokens should now be invalid
    const resA = await client.get('/api/auth/me').header('Authorization', `Bearer ${tokenA}`)
    const resB = await client.get('/api/auth/me').header('Authorization', `Bearer ${tokenB}`)

    resA.assertStatus(401)
    resB.assertStatus(401)
  })

  test('fails with 401 when currentPassword is wrong', async ({ client }) => {
    await createUser({ email: 'badpwd@example.com' })
    const token = await loginAsApi(client, 'badpwd@example.com', 'Test@Pass123')

    const response = await client
      .patch('/api/auth/me')
      .header('Authorization', `Bearer ${token}`)
      .json({ currentPassword: 'Wrong@Pass000', newPassword: 'New@Pass456' })

    response.assertStatus(401)
  })

  test('fails with 422 when newPassword is set without currentPassword', async ({ client }) => {
    await createUser({ email: 'nocp@example.com' })
    const token = await loginAsApi(client, 'nocp@example.com', 'Test@Pass123')

    const response = await client
      .patch('/api/auth/me')
      .header('Authorization', `Bearer ${token}`)
      .json({ newPassword: 'New@Pass456' })

    response.assertStatus(422)
  })

  test('fails with 422 when newPassword is too weak', async ({ client }) => {
    await createUser({ email: 'weakpwd@example.com' })
    const token = await loginAsApi(client, 'weakpwd@example.com', 'Test@Pass123')

    const response = await client
      .patch('/api/auth/me')
      .header('Authorization', `Bearer ${token}`)
      .json({ currentPassword: 'Test@Pass123', newPassword: 'weakpassword' })

    response.assertStatus(422)
  })

  test('returns 401 when unauthenticated', async ({ client }) => {
    const response = await client.patch('/api/auth/me').json({ name: 'Hacker' })
    response.assertStatus(401)
  })
})
