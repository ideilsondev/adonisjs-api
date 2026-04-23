import app from '@adonisjs/core/services/app'
import { type HttpContext, ExceptionHandler } from '@adonisjs/core/http'

export default class HttpExceptionHandler extends ExceptionHandler {
  /**
   * In debug mode, the exception handler will display verbose errors
   * with pretty printed stack traces.
   */
  protected debug = !app.inProduction

  /**
   * The method is used for handling errors and returning
   * response to the client
   */
  async handle(error: unknown, ctx: HttpContext) {
    if (ctx.request.accepts(['json'])) {
      const err = error as any
      const status = err.status || 500
      const message = err.message || 'Internal server error'

      return ctx.response.status(status).send({
        error: {
          message: this.debug ? message : status >= 500 ? 'Internal Server Error' : message,
          code: err.code || 'UNKNOWN_ERROR',
          ...(err.messages ? { details: err.messages } : {}),
        },
      })
    }
    return super.handle(error, ctx)
  }

  /**
   * The method is used to report error to the logging service or
   * the a third party error monitoring service.
   *
   * @note You should not attempt to send a response from this method.
   */
  async report(error: unknown, ctx: HttpContext) {
    return super.report(error, ctx)
  }
}
