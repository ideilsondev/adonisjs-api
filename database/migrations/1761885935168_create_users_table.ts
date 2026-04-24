import { BaseSchema } from '@adonisjs/lucid/schema'

const ROLES = ['admin', 'user'] as const

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.integer('tenant_id').unsigned().index().nullable() // Padrão Multi-tenant SaaS
      
      table.string('name').nullable()
      table.string('email', 254).notNullable().unique()
      table.string('password').notNullable()
      table.boolean('active').notNullable().defaultTo(true)
      table
        .enu('role', ROLES, {
          useNative: true,
          enumName: 'user_role',
          existingType: true,
        })
        .notNullable()
        .defaultTo('user')
      table.boolean('is_super').notNullable().defaultTo(false)

      table.string('avatar_url').nullable()
      table.string('phone').nullable()
      table.string('timezone').nullable().defaultTo('UTC')
      table.string('locale').nullable().defaultTo('pt-BR')
      table.jsonb('metadata').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
      table.timestamp('deleted_at').nullable().index() // Padrão Soft Deletes
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
    this.schema.raw('DROP TYPE IF EXISTS user_role')
  }
}
