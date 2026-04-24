import { type SchemaRules } from '@adonisjs/lucid/types/schema_generator'

/**
 * Schema rules allow you to override the inferred TypeScript type that the
 * schema generator assigns to specific columns.
 *
 * Without this file the generator cannot know that the `role` column in the
 * `users` table maps to the `UserRole` union type — it would fall back to
 * `any`.  Specifying the override here causes every future `migration:run`
 * (which regenerates database/schema.ts) to emit the correct type.
 *
 * Reference: https://lucid.adonisjs.com/docs/schema-generator
 */
export default {
  users: {
    role: {
      type: "import('#models/user').UserRole",
    },
  },
} satisfies SchemaRules
