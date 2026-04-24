import logger from '@adonisjs/core/services/logger'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Security event types that must be audited.
 * Every entry here generates a structured log line.
 */
export type AuditEvent =
  | 'auth:register'
  | 'auth:login_success'
  | 'auth:login_failed'
  | 'auth:login_blocked'
  | 'auth:logout'
  | 'auth:token_created'
  | 'auth:token_revoked'
  | 'auth:all_tokens_revoked'
  | 'auth:unauthorized_access'

interface AuditPayload {
  event: AuditEvent
  userId?: number | null
  email?: string
  ip: string
  userAgent: string
  requestId: string
  meta?: Record<string, unknown>
}

/**
 * AuditLogger — writes structured security events to the application log.
 *
 * All entries share a consistent shape so they can be ingested by any
 * log-aggregation tool (Datadog, Loki, CloudWatch, etc.) and turned into
 * dashboards or alerts.
 *
 * Usage inside a controller:
 *
 *   auditLogger.log(ctx, 'auth:login_success', { userId: user.id, email: user.email })
 */
export default class AuditLogger {
  /**
   * Log a security event.
   *
   * @param ctx   - AdonisJS HTTP context (provides IP, user-agent, request-id)
   * @param event - One of the typed AuditEvent constants
   * @param extra - Optional extra fields merged into the log payload
   */
  log(
    ctx: Pick<HttpContext, 'request'>,
    event: AuditEvent,
    extra: Partial<Omit<AuditPayload, 'event' | 'ip' | 'userAgent' | 'requestId'>> = {}
  ) {
    const payload: AuditPayload = {
      event,
      ip: ctx.request.ip(),
      userAgent: ctx.request.header('user-agent') ?? 'unknown',
      requestId: ctx.request.id() ?? 'unknown',
      ...extra,
    }

    /**
     * Route log level by event severity:
     *  - failures and unauthorized accesses → warn
     *  - everything else (informational) → info
     */
    if (
      event === 'auth:login_failed' ||
      event === 'auth:login_blocked' ||
      event === 'auth:unauthorized_access'
    ) {
      logger.warn(payload, `[AUDIT] ${event}`)
    } else {
      logger.info(payload, `[AUDIT] ${event}`)
    }
  }

  // ─── Convenience helpers ──────────────────────────────────────────────────

  register(ctx: Pick<HttpContext, 'request'>, userId: number, email: string) {
    this.log(ctx, 'auth:register', { userId, email })
  }

  loginSuccess(ctx: Pick<HttpContext, 'request'>, userId: number, email: string) {
    this.log(ctx, 'auth:login_success', { userId, email })
  }

  loginFailed(ctx: Pick<HttpContext, 'request'>, email: string, reason?: string) {
    this.log(ctx, 'auth:login_failed', { email, meta: { reason } })
  }

  loginBlocked(ctx: Pick<HttpContext, 'request'>, email: string) {
    this.log(ctx, 'auth:login_blocked', { email, meta: { reason: 'account_inactive' } })
  }

  logout(ctx: Pick<HttpContext, 'request'>, userId: number) {
    this.log(ctx, 'auth:logout', { userId })
  }

  tokenCreated(ctx: Pick<HttpContext, 'request'>, userId: number) {
    this.log(ctx, 'auth:token_created', { userId })
  }

  tokenRevoked(ctx: Pick<HttpContext, 'request'>, userId: number) {
    this.log(ctx, 'auth:token_revoked', { userId })
  }

  allTokensRevoked(ctx: Pick<HttpContext, 'request'>, userId: number) {
    this.log(ctx, 'auth:all_tokens_revoked', { userId })
  }

  unauthorizedAccess(ctx: Pick<HttpContext, 'request'>, reason?: string) {
    this.log(ctx, 'auth:unauthorized_access', { meta: { reason } })
  }
}
