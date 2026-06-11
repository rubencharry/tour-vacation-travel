# Guía para desarrolladores — Tour Vacation

Todo lo que necesitás saber para trabajar en este proyecto: setup local, workflow de Git, convenciones y pipeline de deploy.

---

## Arquitectura

### Sistema en producción

```
Usuario
  │
  └──HTTPS──► CloudFront (CDN global, TLS, caché)
                  │
                  ├── /          ──► S3 Bucket
                  │                  (Angular SPA — HTML/CSS/JS estático)
                  │
                  └── /api/*     ──► API Gateway
                                          │
                                          └──► Lambda (NestJS)
                                                    │
                                                    ├──► DynamoDB (Plans + Leads)
                                                    ├──► SES (emails)
                                                    └──► Cognito (valida JWT)

Admin ──► Cognito User Pool ──JWT──► API Gateway ──► /api/admin/*
```

No hay servidores corriendo 24/7. Lambda sólo se ejecuta cuando llega una request. DynamoDB cobra por operación. El objetivo de costo es **~$0 USD/mes** con el tráfico esperado.

### Cómo mapea el monorepo a AWS

| Workspace | Qué es | Se convierte en |
|---|---|---|
| `frontend/` | Angular 19 SPA | Archivos estáticos en S3, servidos por CloudFront |
| `backend/` | NestJS 11 API | Función Lambda (Node 22), bundleada con esbuild |
| `infra/` | CDK en TypeScript | Define y despliega todos los recursos de AWS |

### En local vs en producción

| Servicio | Local | Producción |
|---|---|---|
| Frontend | Angular dev server (`:4200`) | S3 + CloudFront |
| Backend | NestJS con `app.listen()` (`:3000`) | Lambda + API Gateway |
| Proxy frontend→backend | `proxy.conf.json` redirige `/api/*` → `:3000` | CloudFront enruta `/api/*` a API Gateway |
| Base de datos | DynamoDB Local JAR (`:8000`) | DynamoDB On-Demand en AWS |
| Emails | Log a consola | Amazon SES |
| Auth de admins | Guard salteado (`BYPASS_AUTH=true`) | Cognito User Pool + JWT |

### Flujo de una request típica

**Landing pública (GET /api/plans):**
```
Browser → CloudFront → API Gateway → Lambda (arranca NestJS si está frío)
       → PlansController → DynamoDBDocumentClient → Plans table
       → responde JSON → CloudFront cachea → Browser renderiza
```

**Captura de lead (POST /api/leads):**
```
Browser → CloudFront → API Gateway → Lambda
       → LeadsController → DynamoDB (escribe Lead)
       → MailService → SES (envía email al interesado)
       → responde 201
```

**Panel admin (cualquier GET /api/admin/*):**
```
Browser → CloudFront → API Gateway (valida JWT con Cognito)
       → Lambda → controller correspondiente → DynamoDB
```

---

## Prerrequisitos

| Herramienta | Versión | Notas |
|---|---|---|
| Node.js | **22 LTS** | Usar `.nvmrc` — es el runtime de Lambda |
| npm | 10+ | Viene con Node 22 |
| AWS CLI | v2 | Solo para deploy / debugging en AWS |
| CDK CLI | último | `npm install -g aws-cdk` — solo para infra |

> Si tenés `nvm` instalado: `nvm use` en la raíz del repo selecciona Node 22 automáticamente.

---

## Setup inicial

```bash
# 1. Clonar el repo
git clone <url-del-repo>
cd tour-vacation

# 2. Instalar todas las dependencias (frontend + backend + infra)
#    SIEMPRE desde la raíz — nunca hacer npm install dentro de una subcarpeta
npm install

# 3. Configurar variables de entorno del backend
cp backend/.env.example backend/.env
# Editar backend/.env con los valores correspondientes al entorno local
```

---

## Variables de entorno

El backend lee `backend/.env` (no versionado). Copiar de `backend/.env.example` y completar:

| Variable | Descripción | Valor local |
|---|---|---|
| `NODE_ENV` | Entorno | `development` |
| `AWS_REGION` | Región AWS | `us-east-1` |
| `DDB_TABLE_PLANS` | Nombre de la tabla Plans | `Plans` |
| `DDB_TABLE_LEADS` | Nombre de la tabla Leads | `Leads` |
| `DDB_ENDPOINT` | Endpoint de DynamoDB | `http://localhost:8000` en local, vacío en prod |
| `SES_FROM_ADDRESS` | Dirección de envío | Cualquier valor en local (no envía real) |
| `COGNITO_USER_POOL_ID` | ID del User Pool | Vacío en local si usás `BYPASS_AUTH=true` |
| `COGNITO_CLIENT_ID` | Client ID de Cognito | Vacío en local si usás `BYPASS_AUTH=true` |
| `BYPASS_AUTH` | Saltea el guard de Cognito | `true` solo en development |

> Los secretos reales (producción) viven en **AWS SSM Parameter Store / Secrets Manager**, nunca en `.env` versionado.

---

## Levantar el proyecto en local

Necesitás dos terminales. Antes de arrancar, levantá DynamoDB Local:

```bash
# DynamoDB Local (JAR oficial — ver instrucciones en /docs/dynamodb-local.md)
java -Djava.library.path=./DynamoDBLocal_lib -jar DynamoDBLocal.jar -sharedDb
```

Luego, en terminales separadas:

```bash
# Terminal 1 — backend en http://localhost:3000
npm run start:backend

# Terminal 2 — frontend en http://localhost:4200
npm run start:frontend
```

El frontend tiene un proxy configurado: cualquier llamada a `/api/*` se redirige automáticamente a `localhost:3000`. No hay que tocar CORS en desarrollo.

Para validar que todo está en pie:

```bash
curl http://localhost:4200/api/health
# → { "status": "pong" }
```

---

## Estructura del monorepo y arquitectura de código

```
tour-vacation/
├── .github/workflows/      → CI (ci.yml) y CD (deploy.yml)
├── frontend/               → Angular 19 SPA
├── backend/                → NestJS 11 API (Lambda-ready)
├── infra/                  → AWS CDK en TypeScript
├── package.json            → workspaces: frontend, backend, infra
└── .nvmrc                  → Node 22 LTS
```

### Backend (NestJS)

```
backend/src/
├── main.ts                  → entry dual: app.listen() local + handler Lambda
├── app.module.ts            → importa todos los módulos
└── modules/
    ├── dynamodb/            → DynamoDBDocumentClient singleton (compartido)
    ├── health/              → GET /api/health → { status: 'pong' }
    ├── plans/               → CRUD de planes turísticos
    │   ├── plans.module.ts
    │   ├── plans.controller.ts   → rutas HTTP, validación de DTOs
    │   ├── plans.service.ts      → lógica de negocio
    │   ├── plans.repository.ts   → operaciones DynamoDB
    │   └── dto/                  → CreatePlanDto, UpdatePlanDto
    ├── leads/               → captura pública + vista admin
    │   └── (misma estructura que plans/)
    ├── mail/                → cliente SES + render de template
    └── auth/                → guard JWT Cognito + decorador @Public()
```

Patrón en cada módulo: `Controller → Service → Repository → DynamoDB`. El controller sólo valida input y delega; el repository sólo habla con DynamoDB.

### Frontend (Angular)

```
frontend/src/app/
├── app.routes.ts            → rutas: / (landing) y /admin (panel)
├── app.config.ts            → providers standalone (HttpClient, Router)
├── core/
│   ├── services/
│   │   ├── api.service.ts   → wrapper de HttpClient con baseUrl
│   │   └── auth.service.ts  → login/logout con Cognito
│   └── guards/
│       └── auth.guard.ts    → protege /admin, redirige a login si no hay JWT
├── features/
│   ├── landing/             → página pública
│   │   ├── plans-list/      → lista de planes activos
│   │   └── lead-form/       → formulario de captura de lead
│   └── admin/               → panel privado
│       ├── login/           → pantalla de login Cognito
│       ├── plans/           → CRUD de planes (tabla + modal)
│       └── leads/           → listado de leads + export CSV
└── shared/                  → componentes reutilizables (botones, inputs, etc.)
```

### Infra (CDK)

```
infra/
├── bin/
│   └── app.ts               → entry point del CDK app
└── lib/
    └── tour-vacation-stack.ts → stack único con todos los recursos AWS
```

Scripts disponibles desde la raíz:

```bash
npm run start:frontend      # Angular dev server (localhost:4200)
npm run start:backend       # NestJS watch mode (localhost:3000)
npm run build:frontend      # Build estático → frontend/dist/
npm run build:backend       # Build NestJS → backend/dist/
npm run test:frontend       # Karma + Jasmine
npm run test:backend        # Jest

# Agregar dependencia a un workspace específico
npm install <paquete> --workspace=backend
npm install <paquete> --workspace=frontend
npm install <paquete> --workspace=infra
```

---

## Workflow de Git

Este proyecto usa **gitflow**. Las ramas `main` y `develop` están protegidas — no se puede hacer push directo.

```
feature/*  ──PR──► develop
fix/*      ──PR──► develop
                      │
                   release/vX.Y.Z ──PR──► main ──► tag vX.Y.Z
                                            ▲
hotfix/vX.Y.Z ──────────────────PR──────────┘ (+ back-merge a develop)
```

### Flujo del día a día (feature nueva)

```bash
# 1. Partir siempre desde develop actualizado
git checkout develop
git pull origin develop

# 2. Crear la rama de feature
git checkout -b feature/nombre-descriptivo

# 3. Trabajar, commitear (ver convención de commits abajo)

# 4. Abrir PR → develop en GitHub
#    El CI corre automáticamente. El PR se puede mergear cuando CI esté verde.
```

### Proceso de release

```bash
# 1. Partir desde develop
git checkout develop && git pull origin develop
git checkout -b release/v1.1.0

# 2. Bump de versión en package.json raíz
#    npm version minor  (o major / patch según corresponda)

# 3. Abrir PR release/v1.1.0 → main
#    Requiere CI verde + 1 aprobación.

# 4. Al mergear:
#    - El workflow crea el tag v1.1.0 automáticamente.
#    - El deploy a AWS se dispara.
#    - Smoke test: GET /api/health debe responder 200.

# 5. Back-merge main → develop para traer el tag
git checkout develop && git pull origin main
git push origin develop
```

### Hotfix

```bash
git checkout main && git pull origin main
git checkout -b hotfix/v1.0.1
# fix, bump patch version
# PR → main (con CI verde + aprobación)
# Back-merge main → develop
```

---

## Convención de commits

Formato: `<tipo>: <descripción en presente, en español>`

| Tipo | Cuándo usarlo |
|---|---|
| `feat:` | Feature nueva |
| `fix:` | Corrección de bug |
| `chore:` | Tarea de mantenimiento (deps, config, scripts) |
| `refactor:` | Refactor sin cambio de comportamiento |
| `docs:` | Solo documentación |
| `test:` | Solo tests |

Ejemplos:
```
feat: agrega endpoint GET /api/plans
fix: corrige validación de email en el form de leads
chore: actualiza dependencias de NestJS
```

---

## CI/CD

### CI (en cada PR)

El workflow `.github/workflows/ci.yml` corre automáticamente al abrir o actualizar un PR contra `develop` o `main`:

1. `npm ci` — instala dependencias limpias
2. Type-check (frontend + backend)
3. Lint (frontend + backend)
4. Tests (frontend + backend)
5. Build (frontend + backend)

**El PR no se puede mergear si CI está en rojo.**

### Deploy (al mergear a `main`)

El workflow `.github/workflows/deploy.yml` detecta qué cambió y sólo redeploya lo necesario:

- Cambios en `frontend/` → build Angular → sync a S3 → invalidación CloudFront
- Cambios en `backend/` o `infra/` → `cdk deploy` → actualiza Lambda + infra
- Al final: smoke test contra `/api/health`. Si falla, el workflow queda en rojo y la versión queda marcada como rota en GitHub.

El deploy usa autenticación **OIDC** con AWS — no hay access keys almacenadas en GitHub Secrets.

---

## Reglas que no se negocian

- Sin push directo a `main` o `develop`.
- Sin `npm install` dentro de `frontend/`, `backend/` o `infra/` — siempre desde la raíz.
- Sin `any` para callar el compilador de TypeScript.
- Sin `console.log` — usar el `Logger` de NestJS.
- Sin credenciales AWS en `.env` versionado ni en código.
- Sin containers, EC2, RDS ni nada con costo por hora — el objetivo es ~$0/mes.
