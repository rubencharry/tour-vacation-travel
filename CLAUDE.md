# CLAUDE.md — Tour Vacation

Guía operativa para Claude Code. **Leer antes de tocar código.** El README es para humanos; este archivo es para vos.

---

## TL;DR

Monorepo **Angular + NestJS** que se despliega a un stack **100% serverless en AWS** (S3+CloudFront, Lambda+API Gateway, DynamoDB, SES, Cognito). Plan comercial: **Plan Premium** = landing pública + panel admin + captura de leads + email automático + directorio de clientes con export CSV.

Objetivo de costo: **~$0 USD/mes**. Cualquier sugerencia que rompa eso (containers, EC2, RDS, procesos 24/7, ORMs SQL con pool persistente) está vetada.

---

## Stack y versiones actuales

| Pieza | Versión | Notas |
|---|---|---|
| Angular | 22 | Standalone, routing, SCSS, **sin SSR** (build estático para S3) |
| NestJS | 11 | TS strict |
| Node | v23.11.0 local / **22 LTS en CI y Lambda** | `.nvmrc` fija Node 22. EBADENGINE warnings en local son inofensivos. |
| npm | 11.6.2 | workspaces nativos |
| TypeScript | ~6.0.2 frontend / ^5.7.3 backend | strict en ambos lados |

---

## Estructura del monorepo

```
tour-vacation/
├── package.json          # npm workspaces: ["frontend", "backend"]
├── package-lock.json     # único, en la raíz
├── node_modules/         # hoisted
├── .gitignore
├── README.md
├── CLAUDE.md             # este archivo
├── frontend/             # Angular SPA
└── backend/              # NestJS API (main.ts dual: local + Lambda handler)
```

Scripts root: `start:frontend`, `start:backend`, `build:*`, `test:*`. **Ejecutar todo desde la raíz**, no entrar a las subcarpetas a hacer `npm install` ahí.

---

## Arquitectura

### Producción (AWS)

```
Usuario
  │
  └──HTTPS──► CloudFront (CDN global, TLS, caché)
                  │
                  ├── /          ──► S3 Bucket (Angular SPA — HTML/CSS/JS estático)
                  │                   └── acceso solo vía OAC, bucket no público
                  │
                  └── /api/*     ──► API Gateway (HTTP API)
                                          │
                                          └──► Lambda (NestJS + serverless-express)
                                                    │
                                                    ├──► DynamoDB (Plans, Leads — On-Demand)
                                                    ├──► SES (emails transaccionales)
                                                    └──► Cognito (valida JWT de admins)

Admin ──► Cognito User Pool ──JWT──► API Gateway ──► rutas /api/admin/*
```

### Monorepo → AWS

| Workspace | Se despliega como | Cómo |
|---|---|---|
| `frontend/` | Archivos estáticos en S3 | `aws s3 sync dist/ s3://bucket` + invalidación CloudFront |
| `backend/` | Función Lambda (Node 22) | Bundleado con esbuild → `cdk deploy` |
| `infra/` | CDK stack (define todos los recursos AWS) | `cdk deploy` desde CI o local |

### Local vs Producción

| Servicio | Local | Producción |
|---|---|---|
| Frontend | Angular dev server en `:4200` | S3 + CloudFront |
| Backend | NestJS con `app.listen()` en `:3000` | Lambda + API Gateway |
| Proxy | `proxy.conf.json` redirige `/api/*` → `:3000` | CloudFront enruta `/api/*` a API Gateway |
| Base de datos | DynamoDB Local JAR en `:8000` | DynamoDB On-Demand en AWS |
| Emails | Log a consola (`NODE_ENV=development`) | Amazon SES |
| Auth | Guard salteado con `BYPASS_AUTH=true` | Cognito User Pool + JWT Authorizer |

### CDK Stack (infra/)

```
TourVacationStack
├── S3 Bucket (frontend)
│     └── BucketPolicy (sólo CloudFront OAC)
├── CloudFront Distribution
│     ├── Origin 1: S3 + OAC → comportamiento default /
│     ├── Origin 2: API Gateway → comportamiento /api/*
│     └── Custom error: 403/404 → /index.html (status 200) ← SPA routing
├── API Gateway HTTP API
│     ├── Ruta ANY /api/{proxy+} → Lambda
│     └── JWT Authorizer (Cognito) → rutas /api/admin/*
├── Lambda Function (Node 22, 512 MB, 30s timeout)
│     └── IAM Role → DynamoDB (Plans, Leads) + SES
├── DynamoDB Table: Plans (PK: planId)
├── DynamoDB Table: Leads (PK: leadId, GSI: email)
└── Cognito User Pool + App Client
```

### Arquitectura de código

**Backend (NestJS) — estructura de módulos:**
```
backend/src/
├── main.ts                  → entry dual: app.listen() en local, handler en Lambda
├── app.module.ts
└── modules/
    ├── dynamodb/            → DynamoDBDocumentClient singleton inyectable
    ├── health/              → GET /api/health
    ├── plans/               → controller / service / repository / dto
    ├── leads/               → controller / service / repository / dto
    ├── mail/                → SES client + template rendering
    └── auth/                → CognitoGuard + @Public() decorator
```

Patrón por módulo: `Controller → Service → Repository`. El controller sólo valida DTOs y delega. El repository sólo habla con DynamoDB. Sin lógica de negocio en el controller ni queries en el service.

**Frontend (Angular) — estructura de features:**
```
frontend/src/app/
├── app.routes.ts            → / → landing, /admin → panel (lazy)
├── core/
│   ├── services/            → ApiService (HttpClient wrapper), AuthService
│   └── guards/              → AuthGuard para /admin
├── features/
│   ├── landing/             → plans-list + lead-form
│   └── admin/               → login, plans CRUD, leads list + CSV export
└── shared/                  → componentes reutilizables
```

**Infra (CDK):**
```
infra/
├── bin/app.ts               → entry point CDK
└── lib/tour-vacation-stack.ts → stack único con todos los recursos
```

**Reglas duras (no negociables):**
- Sin servidores 24/7. Todo on-demand.
- Sin SQL ORMs (TypeORM/Prisma SQL) ni pools de conexión persistentes.
- Sin containers, ECS, EC2, RDS.
- Sin credenciales AWS en `.env` ni en código. Auth entre servicios = **IAM roles**.
- Frontend estático (sin Angular SSR).

---

## Plan Premium — alcance funcional

### 1. Landing pública
- Lista de planes activos, ordenados por `displayOrder`
- Datos de marca: colores, tipografía, logo (a recibir del cliente)
- Mobile-first

### 2. Panel admin (`/admin`)
- Login con Cognito (los ~4 admins se cargan a mano en el User Pool)
- CRUD de **Planes** (título, precio, descripción, imagen, activo, orden)
- Vista de **Leads** con filtros básicos
- Botón "Exportar CSV" del directorio de leads

### 3. Captura de leads
- Form público en la landing
- POST `/api/leads` → escribe en DynamoDB → dispara email vía SES
- Idempotente por `email + planId` dentro de una ventana corta (anti-doble-submit)

### 4. Email automático
- Template básico por plan (al menos uno genérico + uno por plan opcional)
- Enviado desde una identidad SES verificada (ej. `info@tourvacation.com`)
- Marcar `emailSent: true` en el lead tras éxito

### 5. Directorio de clientes
- Tabla en el panel, paginada
- Export CSV (generado en Lambda al vuelo, sin guardar archivo)

---

## Modelo de datos (DynamoDB)

Tablas en On-Demand. **Una tabla por entidad** al principio (más simple que single-table design para este volumen).

### `Plans`
- PK: `planId` (UUID)
- Attrs: `title`, `priceUsd`, `description`, `imageUrl`, `active`, `displayOrder`, `createdAt`, `updatedAt`

### `Leads`
- PK: `leadId` (UUID)
- Attrs: `email`, `name`, `phone`, `interestedPlanId`, `source`, `createdAt`, `emailSent`
- GSI candidato: `email` (para idempotencia y búsquedas)

> Si en algún punto las queries justifican single-table design, refactorizamos. Hasta entonces, simple.

---

## Desarrollo local

### Estado actual (Fase 1 completa)
- `npm install` en la raíz hoistea todas las deps.
- `frontend/` y `backend/` arrancan con `npm run start:frontend` / `start:backend`.
- Proxy Angular→backend: `frontend/proxy.conf.json` + `proxyConfig` en `angular.json` — `/api/*` → `:3000`.
- Variables de entorno: `@nestjs/config` carga `backend/.env` (no versionado). Referencia: `backend/.env.example`.
- `GET /api/health` → `{"status":"pong"}` funcionando.
- `main.ts` dual: `handler` exportado para Lambda, `require.main === module` para dev local.
- Bundle Lambda: `npm run build:lambda` → `nest build` + esbuild → `backend/dist-lambda/main.js` (~2.8 MB).

### Pendiente para desarrollo local cómodo

1. **Emulación de servicios AWS** (Fase 2)
   - **DynamoDB Local** (jar oficial) — el SDK v3 acepta `endpoint: 'http://localhost:8000'`
   - **Email en dev**: log a consola cuando `NODE_ENV=development`. Evitar SES real en local.
   - **Cognito en dev**: bypass del guard con `BYPASS_AUTH=true` (ya en `.env` local).

---

## Adaptación a Lambda (✅ hecha en Fase 1)

`backend/src/main.ts` exporta `handler` para Lambda y usa `require.main === module` para dev local.
Bundle: `npm run build:lambda` → `nest build` (tsc, emite decorator metadata) + esbuild bundlea `dist/main.js` → `dist-lambda/main.js`.

**Notas de la implementación:**
- esbuild NO soporta `emitDecoratorMetadata`, por eso el bundle es two-step: tsc primero, esbuild después.
- Peer deps opcionales de NestJS (`@nestjs/websockets/*`, `@nestjs/microservices/*`, `class-validator`, `class-transformer`) están marcados como `external` en `build-lambda.mjs`.
- El handler de Lambda usa `cachedHandler ??=` para warm starts.

---

## Convenciones de código

- **TS strict** activo. No agregar `any` para callar el compilador.
- **Validación en el borde**: DTOs con `class-validator` en cada endpoint, validación con `ValidationPipe({ whitelist: true, transform: true })`.
- **Sin comentarios obvios.** Los nombres explican el "qué"; sólo comentar el "por qué" cuando no es evidente.
- **Errores**: throw de `HttpException` (o subclases). Nada de `try/catch` para tragar errores silenciosamente.
- **Logs**: `Logger` de Nest, no `console.log`.
- **Commits**: español, presente, prefijo (`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`).
- **Antes de pushear**: correr `npm run lint:check --workspace=backend` localmente para evitar CI roto por Prettier/ESLint.

---

## Decisiones tomadas

| Tema | Decisión |
|---|---|
| IaC | **AWS CDK** (TypeScript, consistente con el stack) |
| Single-table vs multi-table DDB | **Multi-table** al principio |
| Región AWS | **`sa-east-1` (São Paulo)** — audiencia LATAM, ~100ms menos de latencia en API vs us-east-1 |

## URLs de producción (stack desplegado)

| Recurso | URL / ID |
|---|---|
| App (CloudFront) | `https://d3rwutlv921ia8.cloudfront.net` |
| API Gateway | `https://q5omxhvg8k.execute-api.sa-east-1.amazonaws.com/` |
| S3 bucket | `tourvacationstack-frontendbucketefe2e19c-tttfg7jp9eoh` |
| CloudFront ID | `E131V4988IIX50` |

## Decisiones pendientes

| Tema | Opciones | Default sugerido |
|---|---|---|
| Dominio | Route 53 vs externo | A definir cuando haya dominio |
| Manual de marca | Colores, tipografía, logo | **Pedir al cliente antes de la landing** |

---

## Modelo de branching y versionamiento

### Branching (gitflow)

```
feature/*  ──PR──► develop ──── (integración continua)
                      │
                   release/vX.Y.Z ──PR──► main ──► tag vX.Y.Z (producción)
                                            ▲
hotfix/*  ──────────────────────PR──────────┘ + back-merge a develop
```

- `main` y `develop` tienen **branch protection**: no se puede hacer push directo, sólo mediante PR aprobado con CI verde.
- El único camino a `main` es a través de una rama `release/vX.Y.Z` o `hotfix/vX.Y.Z`.

### Versionamiento

**Versión única para el monorepo** (front + back comparten número de versión porque comparten contrato de API). El tag vive en `main` tras cada merge de release.

Convención **semver** (`MAJOR.MINOR.PATCH`):

| Tipo | Cuándo | Ejemplo |
|---|---|---|
| PATCH | Bug fix sin cambio de API ni UI visible | `v1.0.1` |
| MINOR | Feature nueva, backwards compatible | `v1.1.0` |
| MAJOR | Cambio de contrato de API o rediseño importante | `v2.0.0` |

Flujo de release:
1. Desde `develop`: `git checkout -b release/v1.1.0`
2. Ajustar versión en `package.json` raíz si aplica, último QA.
3. PR `release/v1.1.0` → `main` (requiere CI verde + aprobación).
4. Al mergear: el workflow crea el tag `v1.1.0` automáticamente y dispara el deploy.
5. Back-merge de `main` → `develop` para traer el tag.

### Deploy selectivo

El workflow de deploy detecta qué workspace cambió y sólo redeploya lo necesario:
- Cambios sólo en `frontend/` → sync S3 + invalidación CloudFront, **no toca Lambda**.
- Cambios sólo en `backend/` → `cdk deploy` Lambda, **no toca S3**.
- Cambios en `infra/` o en ambos → deploy completo.

---

## Plan de acción

> Leyenda: 💻 = código/repo · ☁️ = acción en AWS · 🐙 = configuración GitHub

---

### Fase 0 — Repositorio GitHub ✅
*(Completa)*

1. ✅ Repo `rubencharry/tour-vacation-travel` en GitHub (público), push a `main`.
2. ✅ Rama `develop` creada.
3. ✅ Branch protection en `main` (PR + 1 aprobación + CI `ci` verde, no force push).
4. ✅ Branch protection en `develop` (PR + CI verde, no force push).
5. ✅ `.nvmrc` con `22`.
6. ✅ `.github/workflows/ci.yml`: lint backend, test backend, build backend y frontend, test frontend.

---

### Fase 1 — Dev environment + validación local ✅
*(Completa — mergeada a develop via PR #1)*

1. ✅ Proxy Angular→backend (`frontend/proxy.conf.json` + `proxyConfig` en `angular.json`).
2. ✅ `@nestjs/config` y `backend/.env` con las vars base.
3. ✅ `backend/.env.example` versionado.
4. ✅ `GET /api/health` → `{"status":"pong"}`.
5. ✅ `main.ts` dual: `handler` Lambda + dev local con `require.main === module`.
6. ✅ Bundle Lambda: `npm run build:lambda` (two-step: nest build + esbuild).

---

### Fase 2 — Backend core (todavía local) ✅
*(Completa — mergeada a develop via PR #2)*

5. ✅ **DynamoDB Local**: JAR oficial descargado, scripts `start:dynamo` y `db:setup` en el monorepo.
6. ✅ **Módulo `dynamodb`**: `DynamoDBDocumentClient` singleton, apunta a `localhost:8000` en dev (via `DDB_ENDPOINT`) y al endpoint real de AWS en prod (variable no seteada).
7. ✅ **Módulo `plans`**: entidad + DTOs + repo DDB + controller (CRUD completo). `imageUrl` → `imageUrls: string[]`.
8. ✅ **Módulo `leads`**: entidad + DTOs + repo DDB + controller (POST público, GET admin).
9. ✅ **Módulo `providers`**: entidad + DTOs + repo DDB + controller (CRUD).

#### Comandos para correr el back + DB en local
```bash
npm run start:dynamo       # levanta DynamoDB Local JAR en :8000
npm run db:setup           # crea tablas locales
npm run start:backend      # NestJS en :3000
npm run start:frontend     # Angular dev server en :4200
```

---

### Fase 3 — Primer deploy en AWS ✅
*(Completa — PR #3, desplegado en sa-east-1)*

**Prerrequisitos ✅:**
- ✅ Cuenta AWS + usuario IAM `claude-ci` con `AdministratorAccess`.
- ✅ Perfil AWS local `tour-vacation` configurado (`aws configure --profile tour-vacation`).
- ✅ CDK CLI instalado globalmente (`npm install -g aws-cdk`).
- ✅ `cdk bootstrap` ejecutado en `sa-east-1`.

**Infra base con CDK ✅ — todo en un solo deploy:**
- ✅ Carpeta `infra/` creada como workspace del monorepo (`infra/bin/app.ts`, `infra/lib/tour-vacation-stack.ts`).
- ✅ Lambda (Node 22, 512 MB, 30s, handler `main.handler`).
- ✅ API Gateway HTTP API — ruta `ANY /api/{proxy+}` → Lambda.
- ✅ S3 bucket — Block Public Access, acceso solo via CloudFront OAC.
- ✅ CloudFront — Origin S3 (default `/`) + Origin API Gateway (`/api/*`), custom error 403/404 → `/index.html` HTTP 200.
- ✅ DynamoDB **Plans** (PK `planId`, On-Demand, RETAIN).
- ✅ DynamoDB **Leads** (PK `leadId`, GSI `email-index`, On-Demand, RETAIN).
- ✅ DynamoDB **Providers** (PK `providerId`, On-Demand, RETAIN).
- ✅ IAM Role Lambda con `grantReadWriteData` sobre las tres tablas.
- ✅ Scripts `deploy:backend` y `deploy:frontend` en `package.json` raíz.
- ✅ Smoke test: `GET https://d3rwutlv921ia8.cloudfront.net/api/health` → `{"status":"pong"}`.

**Pendiente de Fase 3 (antes de pasar a producción real):**
- 🐙 **OIDC provider** en IAM para GitHub Actions (autenticación sin access keys en Secrets).
- 🐙 **IAM role `github-actions-deploy`** con trust policy apuntando al repo.
- 🐙 Guardar en GitHub Secrets: `AWS_ACCOUNT_ID=507744946224`, `AWS_REGION=sa-east-1`.
- 💻 **`.github/workflows/deploy.yml`**: se dispara al mergear a `main`, detecta qué workspace cambió, deploya solo lo necesario, crea tag y smoke test final.

---

### Fase 4 — Mail + Auth

**Código:**
- 💻 **Módulo `mail`**: cliente SES + template básico + dispatch desde `POST /api/leads`.
- 💻 **Módulo `auth`**: guard JWT Cognito + decorador `@Public()` para endpoints de la landing.

**AWS (stack v2):**
- ☁️ **SES — solicitar salida del sandbox**: las cuentas nuevas de AWS sólo pueden enviar emails a direcciones verificadas manualmente. Hay que pedir acceso a producción desde la consola de SES antes del go-live → tarda 1-2 días hábiles. Si no se hace, los emails a clientes reales no se envían aunque todo lo demás funcione.
- ☁️ **SES**: verificar la identidad de envío (dominio preferido sobre email individual — habilita cualquier dirección `@tourvacation.com`).
- ☁️ **IAM policy** en Lambda: `ses:SendEmail` sobre la identidad verificada.
- ☁️ **Cognito User Pool** + App Client (flujo `USER_PASSWORD_AUTH`).
- ☁️ Crear los ~4 admins manualmente en el User Pool (invitación por email).
- ☁️ **JWT Authorizer** en API Gateway apuntando al User Pool (protege las rutas `/api/admin/*`).
- ☁️ Variables de entorno en Lambda: `SES_FROM_ADDRESS`, `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID`.

---

### Fase 5 — Frontend
*(Desarrollado contra la API ya desplegada en AWS)*

- 💻 **Landing**: layout con manual de marca, componente de planes, form de captura de leads.
- 💻 **Panel admin**: shell con login Cognito, CRUD de planes, listado de leads, export CSV.
  - **Imágenes de planes (MVP)**: el admin pega una URL externa en el campo `imageUrl`. Sin upload por ahora — simplifica el MVP evitando un bucket de assets + presigned URLs. Se puede iterar después si el cliente lo pide.
- 💻 **Pipeline frontend**: script `deploy:frontend` que buildea Angular y sincroniza `dist/` al bucket S3.
- ☁️ **Invalidación de CloudFront** al final de cada deploy de frontend.

### Fase 6 — Dominio personalizado
*(Se ejecuta cuando el cliente provea el dominio — puede correr en paralelo con Fase 5)*

- ☁️ **ACM certificate**: crear en la región **`us-east-1`** (obligatorio para CloudFront, sin importar la región del resto de la infra). Validación por DNS.
- ☁️ Adjuntar el certificado a la distribución de CloudFront y agregar el dominio alternativo (CNAME).
- ☁️ **DNS**: si el dominio está en Route 53 → Alias record apuntando a CloudFront. Si está en registrador externo → CNAME al dominio de CloudFront (`xxxx.cloudfront.net`).
- 💻 Actualizar `environment.prod.ts` del frontend con la URL definitiva.

---

## Cosas que NO debe sugerir Claude en este repo

- ❌ Docker / containers / ECS / EKS
- ❌ EC2, RDS, ElastiCache, cualquier cosa con tarifa por hora
- ❌ TypeORM, Prisma con SQL, Sequelize, Mongoose
- ❌ `app.listen()` puro en el entry de Lambda (rompe el handler)
- ❌ Angular SSR / Universal sin pedirlo explícitamente
- ❌ Variables sensibles en `.env` versionado — usar Secrets Manager / SSM Parameter Store
- ❌ `npm install` dentro de `frontend/` o `backend/` — siempre desde la raíz
- ❌ Crear archivos `.md` "de planificación" en la raíz sin que el usuario los pida

---

## Comandos útiles de referencia

```bash
# Levantar todo en local (en 2 terminales)
npm run start:backend
npm run start:frontend

# Tests
npm run test:backend
npm run test:frontend

# Builds
npm run build:backend
npm run build:frontend

# Bundle Lambda (two-step: tsc + esbuild → backend/dist-lambda/main.js)
npm run build:lambda

# Lint — correr ANTES de pushear para evitar CI roto
npm run lint:check --workspace=backend

# Agregar dep a un workspace específico
npm install <pkg> --workspace=backend
npm install <pkg> --workspace=frontend

# Agregar dep al root (herramienta compartida, ej. concurrently)
npm install <pkg> -W
```
