import { test } from '@japa/runner'
import User from '#models/user'
import testUtils from '@adonisjs/core/services/test_utils'

test.group('Auth', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('register new user', async ({ client, assert }) => {
    const response = await client
      .post('/api/auth/register')
      .header('X-Forwarded-For', '192.168.1.1')
      .json({
        fullName: 'Test User',
        email: 'test@example.com',
        password: 'Test@Pass123',
      })

    response.assertStatus(201)
    response.assertBodyContains({ user: { email: 'test@example.com', fullName: 'Test User' } })

    const user = await User.findBy('email', 'test@example.com')
    assert.isNotNull(user)
  })

  test('fails to register with duplicate email', async ({ client }) => {
    await User.create({ email: 'test2@example.com', password: 'Test@Pass123', fullName: 'Test' })

    const response = await client
      .post('/api/auth/register')
      .header('X-Forwarded-For', '192.168.1.2')
      .json({
        fullName: 'Another User',
        email: 'test2@example.com',
        password: 'Test@Pass123',
      })

    response.assertStatus(422) // Unprocessable Entity due to validation
  })

  test('login via api generates token', async ({ client, assert }) => {
    await User.create({ email: 'api@example.com', password: 'Test@Pass123', fullName: 'API' })

    const response = await client
      .post('/api/auth/login')
      .header('X-Forwarded-For', '192.168.1.3')
      .json({
        email: 'api@example.com',
        password: 'Test@Pass123',
        client: 'api',
      })

    response.assertStatus(200)
    const body = response.body() as { token?: string; type?: string }
    assert.exists(body.token)
    assert.equal(body.type, 'bearer')
  })

  test('login via web generates session cookie', async ({ client }) => {
    await User.create({ email: 'web@example.com', password: 'Test@Pass123', fullName: 'Web' })

    const response = await client
      .post('/api/auth/login')
      .header('X-Forwarded-For', '192.168.1.4')
      .json({
        email: 'web@example.com',
        password: 'Test@Pass123',
        client: 'web',
      })

    response.assertStatus(200)
    response.assertCookie('sid')
  })
})
