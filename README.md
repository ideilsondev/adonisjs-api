# Zabe API - AdonisJS Backend

API REST moderna construída com AdonisJS v6, PostgreSQL e Redis, implementando autenticação híbrida (API Tokens + Sessões Web).

## 📋 Stack Tecnológica

- **Framework**: [AdonisJS v6](https://adonisjs.com) (Node.js ESM)
- **Database**: PostgreSQL com [Lucid ORM](https://lucid.adonisjs.com)
- **Cache/Session**: Redis (Valkey em desenvolvimento)
- **Autenticação**: Hybrid Auth (Bearer Tokens + Session Cookies)
- **Validação**: [VineJS](https://vinejs.dev)
- **Testes**: Japa Test Runner
- **Code Quality**: ESLint + Prettier + TypeScript

## 🚀 Pré-requisitos

- Node.js >= 20.6.0
- PostgreSQL >= 14
- Redis >= 6.0
- pnpm (recomendado) ou npm

## 📦 Instalação

```bash
# Clone o repositório
git clone <repository-url>
cd adonisjs-api

# Instale as dependências
pnpm install

# Configure as variáveis de ambiente
cp .env.example .env
# Edite o arquivo .env com suas credenciais

# Execute as migrations
node ace migration:run

# Inicie o servidor de desenvolvimento
pnpm dev
```

## ⚙️ Configuração

### Variáveis de Ambiente

```env
# Application
NODE_ENV=development
PORT=3333
HOST=localhost
APP_KEY=<generate-with: node ace generate:key>
APP_URL=http://localhost:3333

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_DATABASE=zabe_db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Session
SESSION_DRIVER=redis
LOG_LEVEL=info
```

## 📁 Estrutura do Projeto

```
adonisjs-api/
├── app/
│   ├── controllers/     # Controllers MAGROS - apenas HTTP
│   ├── services/        # Services GORDOS - lógica de negócio
│   ├── models/          # Modelos Lucid ORM
│   ├── validators/      # Schemas VineJS
│   ├── middleware/      # Middlewares customizados
│   ├── exceptions/      # Exception handlers
│   └── transformers/    # Data transformers
├── config/              # Arquivos de configuração
├── database/
│   ├── migrations/      # Database migrations
│   └── schema.ts        # Schema auto-gerado (NÃO EDITAR)
├── start/
│   ├── routes/          # Definições de rotas
│   ├── kernel.ts        # Middleware stack
│   └── env.ts           # Validação de env vars
└── tests/
    ├── functional/      # Testes E2E
    └── unit/            # Testes unitários
```

## 🏗️ Arquitetura

### Padrão MVC + Services

```
Request → Middleware → Controller → Validator
                          ↓
                      Service (Business Logic)
                          ↓
                      Model (Database)
                          ↓
                      Response
```

### Regras Arquiteturais

1. **Controllers MAGROS**: Apenas manipulação HTTP, chamadas a validators e services
2. **Services GORDOS**: Toda lógica de negócio, queries complexas, integrações
3. **Validação Obrigatória**: Todo request deve ser validado com VineJS
4. **Zero N+1**: Sempre use `.preload()` para relações
5. **Dependency Injection**: Use `@inject()` nos controllers

## 🔐 Autenticação

### Autenticação Híbrida

A API suporta dois tipos de autenticação no mesmo endpoint:

#### 1. API Token (Stateless)

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "client": "api"
}

# Response
{
  "type": "bearer",
  "token": "oat_xxx..."
}

# Uso
Authorization: Bearer oat_xxx...
```

#### 2. Web Session (Stateful - Redis)

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "client": "web"
}

# Response
Set-Cookie: adonis-session=xxx; HttpOnly; Secure
{
  "message": "Logged in successfully",
  "user": { ... }
}
```

### Rotas Protegidas

```typescript
// start/routes/auth.ts
router
  .group(() => {
    router.post('/logout', [AuthController, 'logout'])
    router.get('/me', [AuthController, 'me'])
  })
  .use(middleware.auth()) // Auto-detecta token ou cookie
```

## 🧪 Testes

```bash
# Executar todos os testes
pnpm test

# Executar testes específicos
node ace test functional
node ace test unit

# Modo watch
node ace test --watch
```

### Exemplo de Teste

```typescript
test('register new user', async ({ client, assert }) => {
  const response = await client.post('/api/auth/register').json({
    email: 'test@example.com',
    password: 'password123',
  })

  response.assertStatus(201)
  assert.exists(response.body().user)
})
```

## 📜 Comandos Disponíveis

```bash
# Desenvolvimento
pnpm dev                # Servidor com HMR
pnpm build              # Build para produção
pnpm start              # Iniciar build de produção

# Database
node ace migration:run  # Executar migrations
node ace migration:rollback
node ace db:seed        # Executar seeders

# Code Quality
pnpm lint               # ESLint
pnpm format             # Prettier
pnpm typecheck          # TypeScript check

# Testes
pnpm test               # Executar testes
node ace test --watch   # Modo watch
```

## 📚 Endpoints da API

### Autenticação

| Método | Endpoint             | Descrição                    | Auth |
| ------ | -------------------- | ---------------------------- | ---- |
| POST   | `/api/auth/register` | Registrar novo usuário       | ❌   |
| POST   | `/api/auth/login`    | Login (API/Web)              | ❌   |
| POST   | `/api/auth/logout`   | Logout                       | ✅   |
| GET    | `/api/auth/me`       | Dados do usuário autenticado | ✅   |

## 🛡️ Segurança

- ✅ **CORS** configurado (dev: permissivo, prod: restritivo)
- ✅ **Helmet/Shield** proteção contra ataques comuns
- ✅ **Rate Limiting** via Redis (configurável)
- ✅ **Password Hashing** com Argon2
- ✅ **HttpOnly Cookies** para sessões web
- ✅ **CSRF Protection** via Shield middleware
- ✅ **.env** no `.gitignore`

## 🔧 Desenvolvimento

### Adicionar Nova Feature

1. **Criar Migration**

```bash
node ace make:migration create_posts_table
```

2. **Criar Model**

```bash
node ace make:model Post
```

3. **Criar Validator**

```typescript
// app/validators/post.ts
export const createPostValidator = vine.compile(
  vine.object({
    title: vine.string().minLength(3),
    content: vine.string(),
  })
)
```

4. **Criar Service**

```typescript
// app/services/post_service.ts
export default class PostService {
  async create(data) {
    return await Post.create(data)
  }
}
```

5. **Criar Controller**

```typescript
// app/controllers/posts_controller.ts
@inject()
export default class PostsController {
  constructor(private postService: PostService) {}

  async store({ request, response }: HttpContext) {
    const data = await request.validateUsing(createPostValidator)
    const post = await this.postService.create(data)
    return response.created({ post })
  }
}
```

6. **Adicionar Rota**

```typescript
// start/routes.ts
router.post('/posts', [PostsController, 'store']).use(middleware.auth())
```

## 📊 Performance

- ✅ **Database Connection Pooling**
- ✅ **Redis Caching** para sessões
- ✅ **Query Optimization** (evitar N+1)
- ✅ **HMR** em desenvolvimento
- ✅ **Compression** em produção

## 🐛 Debug

```bash
# Logs detalhados
LOG_LEVEL=debug pnpm dev

# PostgreSQL queries
DB_DEBUG=true pnpm dev

# Redis commands
REDIS_DEBUG=true pnpm dev
```

## 📖 Documentação Adicional

- [AdonisJS Docs](https://docs.adonisjs.com)
- [Lucid ORM](https://lucid.adonisjs.com)
- [VineJS Validation](https://vinejs.dev)
- [Japa Testing](https://japa.dev)

## 👥 Contribuindo

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## 📄 Licença

MIT License - veja [LICENSE](LICENSE) para mais detalhes.

---

**Desenvolvido com ❤️ usando AdonisJS**
