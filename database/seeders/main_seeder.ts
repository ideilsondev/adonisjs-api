import { BaseSeeder } from '@adonisjs/lucid/seeders'
import User from '#models/user'
import env from '#start/env'
import logger from '@adonisjs/core/services/logger'

export default class MainSeeder extends BaseSeeder {
  static environment = ['development']

  async run() {
    const email = env.get('SEED_ADMIN_EMAIL')
    const password = env.get('SEED_ADMIN_PASSWORD')
    const name = env.get('SEED_ADMIN_NAME') ?? 'Master Admin'
    const isSuper = env.get('SEED_ADMIN_IS_SUPER') ?? true

    if (!email || !password) {
      logger.warn(
        '[seeder] SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are required. Skipping.'
      )
      return
    }

    const existing = await User.findBy({ email })
    if (existing) {
      existing.name = name
      existing.password = password
      existing.role = 'admin'
      existing.active = true
      existing.isSuper = isSuper
      await existing.save()
      logger.info(
        { email: existing.email, role: existing.role, isSuper: existing.isSuper },
        '[seeder] Admin user already exists — updated.'
      )
      return
    }

    const user = await User.create({
      name,
      email,
      password,
      role: 'admin',
      active: true,
      isSuper,
    })

    logger.info({ email: user.email, role: user.role, isSuper: user.isSuper }, '[seeder] Admin user created.')
  }
}
