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
| Angular | 19 | Standalone, routing, SCSS, **sin SSR** (build estático para S3) |
| NestJS | 11 | TS strict |
| Node | v23.11.0 instalado | ⚠️ Lambda soporta 20/22 LTS. Hay que pasar a **Node 22 LTS** antes del deploy. |
| npm | 11.6.2 | workspaces nativos |
| TypeScript | 5.x | strict en ambos lados |

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
└── backend/              # NestJS API (todavía con app.listen() puro)
```

Scripts root: `start:frontend`, `start:backend`, `build:*`, `test:*`. **Ejecutar todo desde la raíz**, no entrar a las subcarpetas a hacer `npm install` ahí.

---

## Arquitectura objetivo

Ver `README.md` para el diagrama. Resumen mental:

```
Usuario ──HTTPS──► CloudFront ──/──► S3 (Angular SPA)
                       │
                       └──/api/*──► API Gateway ──► Lambda (NestJS) ──► DynamoDB
                                                              │
                                                              ├──► SES (emails)
                                                              └──► Cognito (verify JWT)
Admin login ──► Cognito User Pool ──JWT──► API Gateway
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

### Estado actual
- `npm install` en la raíz ya funciona y hoistea las deps.
- `frontend/` y `backend/` arrancan con `npm run start:frontend` / `start:backend`.
- **Falta**: proxy del frontend al backend para evitar CORS en dev.

### Pendientes para desarrollo local cómodo

1. **Proxy de Angular hacia el backend**
   - Crear `frontend/proxy.conf.json` mapeando `/api/*` → `http://localhost:3000`
   - Ajustar el `start` de Angular para usar `--proxy-config proxy.conf.json`

2. **Variables de entorno**
   - Backend: `@nestjs/config` cargando `backend/.env` (no versionado)
   - Vars iniciales: `AWS_REGION`, `DDB_TABLE_PLANS`, `DDB_TABLE_LEADS`, `SES_FROM_ADDRESS`, `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID`
   - Frontend: `environment.ts` / `environment.prod.ts` con `apiBaseUrl`

3. **Emulación de servicios AWS**
   - **DynamoDB Local** (jar oficial o `amazon/dynamodb-local` en Docker) — el SDK v3 acepta `endpoint: 'http://localhost:8000'`
   - **Email en dev**: imprimir a consola O capturar con MailHog. Evitar SES real en local.
   - **Cognito en dev**: opción simple → bypass del guard con flag `BYPASS_AUTH=true` solo en dev. Opción robusta → `cognito-local`.

---

## Adaptación a Lambda (todavía no hecha)

`backend/src/main.ts` actualmente arranca con `app.listen(3000)`. Para Lambda hay que:

1. Instalar `@vendia/serverless-express` y `aws-lambda`.
2. Refactorear `main.ts` para exportar **dos cosas**:
   - `bootstrap()` que hace `app.listen()` cuando se corre local (`if (require.main === module)`)
   - `handler` exportado que envuelve la app Nest con `serverless-express` para Lambda

3. Apuntar el `entry` del bundler (esbuild/webpack) al archivo del handler.
4. Verificar que `validation pipes`, `cors`, etc. se aplican antes del `createHandler`.

**Patrón de referencia:**
```ts
// main.ts (esquemático)
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import serverlessExpress from '@vendia/serverless-express';
import type { Handler } from 'aws-lambda';
import { AppModule } from './app.module';

let cachedHandler: Handler;

async function bootstrapServer(): Promise<Handler> {
  const expressApp = express();
  const nestApp = await NestFactory.create(AppModule, new ExpressAdapter(expressApp));
  nestApp.enableCors();
  await nestApp.init();
  return serverlessExpress({ app: expressApp });
}

export const handler: Handler = async (event, context, callback) => {
  cachedHandler = cachedHandler ?? (await bootstrapServer());
  return cachedHandler(event, context, callback);
};

if (require.main === module) {
  (async () => {
    const expressApp = express();
    const nestApp = await NestFactory.create(AppModule, new ExpressAdapter(expressApp));
    nestApp.enableCors();
    await nestApp.listen(3000);
  })();
}
```

---

## Convenciones de código

- **TS strict** activo. No agregar `any` para callar el compilador.
- **Validación en el borde**: DTOs con `class-validator` en cada endpoint, validación con `ValidationPipe({ whitelist: true, transform: true })`.
- **Sin comentarios obvios.** Los nombres explican el "qué"; sólo comentar el "por qué" cuando no es evidente.
- **Errores**: throw de `HttpException` (o subclases). Nada de `try/catch` para tragar errores silenciosamente.
- **Logs**: `Logger` de Nest, no `console.log`.
- **Commits**: español, presente, prefijo (`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`).

---

## Decisiones pendientes (a charlar con el usuario)

| Tema | Opciones | Default sugerido |
|---|---|---|
| IaC | AWS SAM · AWS CDK · Serverless Framework · Terraform | **CDK** (TS, encaja con el stack) o **SAM** (más simple) |
| Región AWS | `us-east-1`, `sa-east-1`, etc. | `us-east-1` (más servicios, más barato) |
| Dominio | Route 53 vs externo | A definir cuando haya dominio |
| Single-table vs multi-table DDB | — | Multi-table al principio |
| Manual de marca | Colores, tipografía, logo | **Pedir al cliente antes de la landing** |

---

## Próximos pasos (próxima sesión)

Orden sugerido — ir confirmando uno por uno con el usuario:

1. **🔌 Proxy de Angular hacia el backend** (`proxy.conf.json` + ajuste de `start`).
2. **⚙️ `@nestjs/config` y `.env`** en el backend con las vars listadas arriba.
3. **📦 Adaptar `main.ts` a Lambda** con `@vendia/serverless-express` preservando el dev local.
4. **💾 Módulo `dynamodb`** en NestJS con un `DynamoDBClient` + `DynamoDBDocumentClient` singleton.
5. **📋 Módulo `plans`**: entidad + DTOs + repo DDB + controller (CRUD).
6. **📋 Módulo `leads`**: entidad + DTOs + repo DDB + controller (POST público, GET admin).
7. **📧 Módulo `mail`**: cliente SES + render simple de template + dispatch desde el handler de POST `/leads`.
8. **🔐 Módulo `auth`**: guard que valida JWT de Cognito + decorador `@Public()` para endpoints abiertos (landing).
9. **🏠 Frontend — landing**: layout base con datos del manual de marca, componente de planes, form de leads.
10. **🛠️ Frontend — panel admin**: shell con login Cognito, CRUD de planes, listado de leads, export CSV.
11. **☁️ Infra como código** (CDK/SAM): bucket S3, distribución CloudFront, API Gateway, función Lambda, tablas DDB, User Pool Cognito, identidad SES.
12. **🚀 Pipeline de deploy**: build + sync a S3 + invalidación CloudFront + deploy Lambda.

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

# Agregar dep a un workspace específico
npm install <pkg> --workspace=backend
npm install <pkg> --workspace=frontend

# Agregar dep al root (herramienta compartida, ej. concurrently)
npm install <pkg> -W
```
