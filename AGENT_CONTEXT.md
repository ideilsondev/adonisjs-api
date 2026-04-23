# SYSTEM CONTEXT & RULES FOR AI AGENTS (Zabe API)

**DO NOT HALLUCINATE**. This project follows a strict architectural pattern. Before writing any code for this project, read and internalize these rules.

## 1. Stack & Infrastructure
- **Framework**: AdonisJS v6 (Node.js ESM)
- **Database**: PostgreSQL (`zabe_db`, user `postgres`) via Lucid ORM.
- **Cache / Session / Rate Limit**: Redis (Valkey locally, port 6379).
- **Authentication**: `@adonisjs/auth` (Hybrid: `api` guard for Bearer Tokens, `web` guard for Redis-backed cookies).
- **Validation**: VineJS (`@vinejs/vine`).

## 2. Directory Structure & Responsibilities
- `app/controllers/`: Must be THIN. Responsibilities: extract request data, call VineJS validators, call `AuthService` or other Services, and format the HTTP response. **NEVER put business logic here.**
- `app/services/`: Must be FAT. All business logic, third-party API calls, and complex DB queries live here.
- `app/validators/`: All validation schemas live here using VineJS. 
- `app/models/`: Lucid ORM Models. Schema is auto-generated in `database/schema.ts` based on models.
- `app/exceptions/handler.ts`: Global exception handler. Configured to ALWAYS return standardized JSON on API requests (`error.message`, `error.code`).
- `start/routes.ts`: Route definitions. Grouped and protected by `middleware.auth()`.

## 3. Strict Coding Rules
1. **Validation is Mandatory**: Use `await request.validateUsing(myValidator)` at the very top of every controller method. Once validated, trust the data.
2. **Eradicate N+1 Queries**: Never loop and query. Always use `.preload('relation')` when querying via Lucid ORM.
3. **Dependency Injection**: Always use constructor injection in Controllers to load Services (use `@inject()` decorator from `@adonisjs/core`). Use `#services/` alias for imports.
4. **No Raw SQL**: Use Lucid ORM for all database interactions.
5. **JSON Responses**: Keep responses consistent. Controllers must return standard JSON formats. 

## 4. Current Authentication State (Hybrid)
We use a unified login endpoint that switches behavior based on the `client` payload.
- **Endpoint**: `POST /api/auth/login`
- **Payload**: `{ email, password, client: 'web' | 'api' }`
- **If `client: 'web'`**: The backend uses `ctx.auth.use('web').login(user)`, creates a stateful session stored in **Redis**, and returns an `adonis-session` `HttpOnly` Cookie.
- **If `client: 'api'`**: The backend creates a token via `User.accessTokens.create(user)` and returns a JSON payload with the `Bearer` token.
- **Protected Routes**: Wrap routes with `.use(middleware.auth())`. The middleware automatically detects if the user is authenticated via cookie or token.

## 5. Development Commands
- **Run dev server**: `npm run dev`
- **Run migrations**: `node ace migration:run`
- **Run tests**: `node ace test`
- **Typecheck**: `npm run typecheck`
