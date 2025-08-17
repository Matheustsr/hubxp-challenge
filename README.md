# Auth Gateway - Teste Técnico

Repositório gerado para o teste técnico. Inclui:

- API /auth/login e /auth/validate
- Provedores mock (google, azure)
- Redis token cache
- Rate limiter e circuit breaker
- Adapter para sistema legado com retry/backoff e idempotência
- Docker + docker-compose
- Tests (Jest) e CI (GitHub Actions)
- Documentação OpenAPI/Swagger

## Como rodar local

1. Copie `.env.example` para `.env` e ajuste se quiser.
2. Rode com docker-compose:

```bash
docker-compose up --build
```

## Rodando testes de carga com k6
Para rodar testes de carga, instale o k6 e execute o seguinte comando:

```bash
k6 run load-test.js
```

3. Acesse a aplicação em `http://localhost:3000`

## Endpoints Disponíveis

- **POST /auth/login** - Autenticação via provedores
- **GET /auth/validate** - Validação de token JWT
- **GET /health** - Health check da aplicação
- **GET /metrics** - Métricas do Prometheus
- **GET /docs** - Documentação Swagger UI

## Documentação da API

Acesse `http://localhost:3000/docs` para ver a documentação completa da API no Swagger UI.

## Credenciais de Teste

### Google Provider
```json
{
  "provider": "google",
  "credentials": {
    "token": "google_valid_token_123"
  }
}
```

### Azure Provider

**Usuário comum:**
```json
{
  "provider": "azure",
  "credentials": {
    "username": "john.doe",
    "password": "Test@123"
  }
}
```

**Administrador:**
```json
{
  "provider": "azure",
  "credentials": {
    "username": "admin",
    "password": "Admin@123"
  }
}
```

## Exemplos de Uso

### 1. Login (obter token)

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "azure",
    "credentials": {
      "username": "john.doe",
      "password": "Test@123"
    }
  }'
```

Resposta:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 2. Validar token

```bash
curl -X GET http://localhost:3000/auth/validate \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

Resposta:
```json
{
    "valid": true,
    "payload": {
        "sub": "azure-john",
        "provider": "azure",
        "role": "user",
        "jti": "939e1c665e6b7a27b71b252a610771a3",
        "iss": "hubxp-auth",
        "aud": "hubxp-api",
        "iat": 1755415265,
        "exp": 1755416165
    }
}
```

### 3. Health check

```bash
curl http://localhost:3000/health
```

Resposta:
```json
{
    "status": "ok",
    "redis": true,
    "feature_flags": {
        "rate_limiting": true,
        "metrics": true,
        "circuit_breaker": true,
        "cache_token": true
    },
    "timestamp": "2025-08-17T07:33:22.778Z"
}
```

## Estrutura do Projeto(outdated)

```
src/
├── app.ts              # Configuração do Express
├── server.ts           # Entry point da aplicação
├── config/             # Configurações
├── controllers/        # Controllers da API
├── services/           # Serviços (JWT, provedores)
├── middleware/         # Middlewares (rate limiter, circuit breaker)
├── infra/              # Infraestrutura (Redis)
├── logs/               # Sistema de logs
└── utils/              # Utilitários
```

## Tecnologias Utilizadas

- **Node.js** + **TypeScript**
- **Express.js** - Framework web
- **Redis** - Cache de tokens
- **JWT** - Autenticação
- **Helmet** - Segurança
- **Zod** - Blindagem da API
- **Pino** - Logging estruturado
- **Prometheus** - Métricas
- **Swagger UI** - Documentação da API
- **Jest** - Testes
- **Docker** - Containerização
- **GitHub Actions** - CI/CD

## Desenvolvimento

### Instalar dependências
```bash
npm install
```

### Executar testes
```bash
npm test
```

### Executar com Docker
```bash
docker-compose up --build
```


 
