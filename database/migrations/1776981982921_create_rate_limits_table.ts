import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Migration for the rate_limits table.
 *
 * The schema must exactly match what rate-limiter-flexible expects when
 * operating in "tableCreated: true" mode (i.e. the library trusts that the
 * table already exists with the correct structure).
 *
 * Required columns (from RateLimiterPostgres source):
 *
 *   key    varchar(255) PRIMARY KEY  — composite of keyPrefix + identifier
 *   points integer      NOT NULL     — requests consumed in the current window
 *   expire bigint       NULLABLE     — Unix epoch in milliseconds; NULL = never
 *
 * DO NOT add extra columns (id, created_at, …) — the library builds raw SQL
 * against this exact schema and will fail if unexpected columns are present
 * in INSERT … ON CONFLICT … DO UPDATE SET statements.
 */
export default class extends BaseSchema {
  protected tableName = 'rate_limits'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('key', 255).primary()
      table.integer('points').notNullable().defaultTo(0)
      table.bigInteger('expire').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
