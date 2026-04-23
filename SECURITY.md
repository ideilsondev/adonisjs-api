# 🔒 Security Policy

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability, please send an email to **security@yourcompany.com** with:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

You should receive a response within **48 hours**. We will acknowledge your contribution once the issue is resolved.

---

## 🛡️ Security Features Implemented

### ✅ Rate Limiting

**Status: ENABLED**

All authentication endpoints are protected with aggressive rate limiting to prevent brute force attacks.

#### Login Endpoint

```
Endpoint: POST /api/auth/login
Rate Limit: 5 requests per 15 minutes
Block Duration: 30 minutes after limit exceeded
Tracking: By IP address
```

#### Registration Endpoint

```
Endpoint: POST /api/auth/register
Rate Limit: 3 requests per hour
Block Duration: 2 hours after limit exceeded
Tracking: By IP address
```

#### Global API Limit

```
Scope: All authenticated requests
Rate Limit: 100 requests per minute
Block Duration: 5 minutes after limit exceeded
```

**Response Headers:**

```http
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 3
X-RateLimit-Reset: 900
Retry-After: 900
```

**Error Response (429 Too Many Requests):**

```json
{
  "error": {
    "message": "Too many login attempts. Please try again later.",
    "code": "E_TOO_MANY_REQUESTS",
    "retryAfter": 900,
    "limit": 5,
    "remaining": 0
  }
}
```

---

### ✅ CSRF Protection

**Status: ENABLED for Web Sessions**

Cross-Site Request Forgery protection is enabled for all session-based authentication.

**Configuration:**

- **API Routes:** Excluded (use Bearer tokens - not vulnerable to CSRF)
- **Web Routes:** Protected with CSRF tokens
- **Token Exposure:** `XSRF-TOKEN` cookie enabled for frontend frameworks

**How to use (Frontend):**

1. Read the `XSRF-TOKEN` cookie
2. Include it in the `X-XSRF-TOKEN` header on state-changing requests

**Excluded Routes:**

```
/api/auth/login
/api/auth/register
/api/* (when using Bearer tokens)
```

---

### ✅ Strong Password Policy

**Status: ENFORCED**

All passwords must meet the following requirements:

#### Requirements

- ✅ Minimum length: **8 characters**
- ✅ Maximum length: **128 characters**
- ✅ At least **one lowercase** letter (a-z)
- ✅ At least **one uppercase** letter (A-Z)
- ✅ At least **one number** (0-9)
- ✅ At least **one special character** (!@#$%^&\*...)
- ✅ **Not a common password** (password123, 12345678, qwerty, etc.)

#### Examples

```
❌ "password123"      - Too common
❌ "12345678"         - No letters
❌ "abcdefgh"         - No numbers or special chars
❌ "Password"         - No numbers or special chars
✅ "MyP@ssw0rd123"    - Valid
✅ "Secure!Pass99"    - Valid
✅ "Tr0ng#Senh@2024"  - Valid
```

#### Error Response (422 Unprocessable Entity):

```json
{
  "error": {
    "message": "Validation failed",
    "code": "E_VALIDATION_ERROR",
    "details": [
      {
        "field": "password",
        "message": "Password must contain at least one uppercase letter, at least one number, at least one special character"
      }
    ]
  }
}
```

---

### ✅ Password Hashing

**Algorithm: Scrypt**

All passwords are hashed using the **Scrypt** algorithm with the following parameters:

```typescript
cost: 16384 // CPU/memory cost factor (N)
blockSize: 8 // Block size (r)
parallelization: 1 // Parallelization factor (p)
maxMemory: 33554432 // 32 MB max memory
```

**Why Scrypt?**

- ✅ Memory-hard algorithm (resistant to GPU/ASIC attacks)
- ✅ Configurable cost factor
- ✅ Recommended by OWASP
- ✅ Better than bcrypt for password hashing

**Never:**

- ❌ Store passwords in plain text
- ❌ Use MD5 or SHA1 for passwords
- ❌ Use reversible encryption
- ❌ Log passwords

---

### ✅ Authentication Security

#### Session-Based (Web)

```
Cookie Name: adonis-session
HttpOnly: true              // Prevents JavaScript access
Secure: true (production)   // HTTPS only
SameSite: lax               // CSRF protection
Max Age: 2 hours            // Auto-logout
Storage: Redis              // Persistent storage
```

#### Token-Based (API)

```
Type: Bearer Token
Format: oat_xxx...
Storage: Database (auth_access_tokens table)
Expiration: Configurable per token
Revocable: Yes (can be deleted)
```

**Best Practices:**

- ✅ Use HTTPS in production
- ✅ Store tokens securely (never in localStorage for web apps)
- ✅ Implement token refresh mechanism
- ✅ Revoke tokens on logout
- ✅ Set appropriate expiration times

---

### ✅ HTTP Security Headers

**Shield Middleware Enabled**

The following security headers are automatically added to all responses:

```http
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Strict-Transport-Security: max-age=15552000; includeSubDomains
```

**What they do:**

- **X-Frame-Options:** Prevents clickjacking attacks
- **X-Content-Type-Options:** Prevents MIME-sniffing attacks
- **HSTS:** Forces HTTPS for 180 days

---

### ✅ CORS Configuration

**Development:**

```typescript
origin: true // Allow all origins (for local dev)
```

**Production:**

```typescript
origin: [] // Explicitly configure allowed origins
credentials: true
methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE']
```

**Before deploying to production:**

1. Update `config/cors.ts`
2. Add your frontend domain to `origin` array:

```typescript
origin: ['https://yourdomain.com', 'https://app.yourdomain.com']
```

---

### ✅ SQL Injection Prevention

**Status: PROTECTED**

All database queries use **Lucid ORM** with parameterized queries:

```typescript
// ✅ SAFE - Parameterized query
await User.findBy('email', userEmail)

// ✅ SAFE - Query builder
await db.from('users').where('email', email).first()

// ❌ NEVER DO THIS - Raw SQL with string concatenation
await db.rawQuery(`SELECT * FROM users WHERE email = '${email}'`)
```

**Rules:**

- ✅ Always use Lucid ORM methods
- ✅ Use query builder for complex queries
- ✅ Validate all user input
- ❌ Never concatenate user input into SQL strings

---

### ✅ Input Validation

**VineJS Validator**

All user input is validated before processing:

```typescript
// Example: Login validation
{
  email: vine.string().email().trim().normalizeEmail(),
  password: vine.string(),
  client: vine.enum(['web', 'api']).optional()
}
```

**Validation Features:**

- ✅ Type checking
- ✅ Format validation (email, URL, etc.)
- ✅ Length constraints
- ✅ Custom rules
- ✅ Sanitization (trim, normalize)
- ✅ Database uniqueness checks

---

## ⚠️ Known Vulnerabilities & Mitigation

### 1. Dependency Vulnerabilities

**lodash-es@4.17.23 (CVE-2026-4800)**

```
Severity: HIGH (CVSS 8.1)
Type: Code Injection via _.template
Status: ⚠️ Indirect dependency via prettier-plugin-edgejs
Impact: Low (template function not used in application code)
Mitigation: Monitoring for updates
```

**Action Required:**

```bash
# Check for updates regularly
pnpm audit
pnpm update
```

---

## 🚀 Production Security Checklist

Before deploying to production, ensure:

### Environment Variables

- [ ] `NODE_ENV=production`
- [ ] Strong `APP_KEY` (32+ random characters)
- [ ] Unique, strong `DB_PASSWORD`
- [ ] Unique, strong `REDIS_PASSWORD`
- [ ] Valid `APP_URL` (HTTPS)
- [ ] `SESSION_DRIVER=redis` (not cookie)

### CORS Configuration

- [ ] Configure allowed origins in `config/cors.ts`
- [ ] Remove `origin: true` (dev-only setting)
- [ ] Set `credentials: true` if needed

### HTTPS/SSL

- [ ] Enable HTTPS
- [ ] Install valid SSL certificate
- [ ] Force HTTPS redirect
- [ ] Enable HSTS header

### Database Security

- [ ] Use strong database password
- [ ] Restrict database access by IP
- [ ] Enable SSL for database connections
- [ ] Regular backups
- [ ] Limit database user permissions

### Redis Security

- [ ] Set strong Redis password
- [ ] Bind Redis to localhost (if on same server)
- [ ] Use Redis ACL (Access Control Lists)
- [ ] Enable Redis persistence

### Monitoring & Logging

- [ ] Set up error tracking (e.g., Sentry)
- [ ] Enable access logs
- [ ] Monitor failed login attempts
- [ ] Set up alerts for security events
- [ ] Log retention policy

### Rate Limiting

- [ ] Verify Redis is working
- [ ] Test rate limits before deployment
- [ ] Configure alerts for rate limit violations
- [ ] Document rate limits in API docs

### Additional Recommendations

- [ ] Implement 2FA (Two-Factor Authentication)
- [ ] Add email verification
- [ ] Implement "forgot password" flow
- [ ] Set up account lockout (after N failed attempts)
- [ ] Add session management (view/revoke active sessions)
- [ ] Implement password reset tokens
- [ ] Add audit logging for sensitive operations
- [ ] Regular security audits
- [ ] Dependency updates (weekly)
- [ ] Penetration testing

---

## 🔐 Secure Coding Practices

### DO's ✅

1. **Always validate user input**

```typescript
const data = await request.validateUsing(validator)
```

2. **Use prepared statements (Lucid ORM)**

```typescript
await User.query().where('email', email)
```

3. **Hash sensitive data**

```typescript
user.password = await hash.make(password)
```

4. **Use environment variables**

```typescript
const apiKey = env.get('API_KEY')
```

5. **Implement proper error handling**

```typescript
try {
  // code
} catch (error) {
  logger.error(error)
  return response.internalServerError({ error: 'Something went wrong' })
}
```

6. **Log security events**

```typescript
logger.warn({ email, ip }, 'Failed login attempt')
```

### DON'Ts ❌

1. **Never store passwords in plain text**

```typescript
// ❌ NEVER
user.password = password
```

2. **Never expose sensitive data in responses**

```typescript
// ❌ NEVER
return { user, password: user.password }
```

3. **Never log sensitive information**

```typescript
// ❌ NEVER
console.log('User password:', password)
```

4. **Never trust user input**

```typescript
// ❌ NEVER skip validation
const data = request.all()
```

5. **Never hardcode secrets**

```typescript
// ❌ NEVER
const apiKey = 'sk-1234567890'
```

6. **Never use == for comparisons**

```typescript
// ❌ NEVER
if (user.role == 'admin')

// ✅ ALWAYS
if (user.role === 'admin')
```

---

## 📚 Security Resources

### Official Documentation

- [AdonisJS Security Guide](https://docs.adonisjs.com/guides/security/introduction)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Cheat Sheets](https://cheatsheetseries.owasp.org/)

### Tools

- [npm audit](https://docs.npmjs.com/cli/v8/commands/npm-audit)
- [Snyk](https://snyk.io/)
- [OWASP ZAP](https://www.zaproxy.org/)

### Best Practices

- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)

---

## 📝 Security Updates

This document is updated regularly. Last update: **2024**

For the latest security information, check:

- This SECURITY.md file
- GitHub Security Advisories
- Dependency audit reports

---

## 📧 Contact

For security-related questions:

- **Email:** security@yourcompany.com
- **Bug Bounty:** (if applicable)

**Response Time:** Within 48 hours

---

**Remember: Security is not a feature, it's a process. Stay vigilant! 🛡️**
