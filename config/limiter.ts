import app from '@adonisjs/core/services/app'
import { defineConfig, stores } from '@adonisjs/limiter'
import type { InferLimiters } from '@adonisjs/limiter/types'

const limiterConfig = defineConfig({
  /**
   * Default store to use for rate limiting.
   * Redis is recommended for production environments.
   * Database is used in test environment to avoid Redis dependency.
   */
  default: app.inTest ? 'memory' : 'redis',

  /**
   * List of available stores for rate limiting
   */
  stores: {
    /**
     * Redis store configuration
     * Uses the main Redis connection defined in config/redis.ts
     */
    redis: stores.redis({
      connectionName: 'main',
    }),

    /**
     * In-memory store used exclusively in the test environment.
     *
     * Benefits over the database store for tests:
     *  - Zero schema dependency (no rate_limits table required)
     *  - State is fully isolated per process — each test run starts clean
     *  - No shared state between parallel test workers
     *  - No async I/O overhead (faster tests)
     *
     * NEVER use this in production: state is not shared across
     * multiple Node.js processes / dynos.
     */
    memory: stores.memory({}),

    /**
     * Database store as fallback for environments without Redis.
     * Requires the rate_limits table (see the corresponding migration).
     */
    database: stores.database({
      tableName: 'rate_limits',
    }),
  },
})

export default limiterConfig

declare module '@adonisjs/limiter/types' {
  export interface LimitersList extends InferLimiters<typeof limiterConfig> {}
}
