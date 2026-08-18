# TaskFlow Pro — Seguimiento de Proyectos

Aplicación web para la **gestión y seguimiento de proyectos y sus actividades**, construida con **React + Astro + Supabase**. Permite a los equipos planificar tareas con dependencias (predecesoras/sucesoras), visualizar cronogramas con un **diagrama de Gantt**, controlar el acceso por proyecto y **importar/exportar actividades desde Excel**.

## Características

- **Gestión de proyectos**: crear, editar, eliminar y buscar proyectos.
- **Gestión de actividades**: alta, edición y eliminación de actividades con límite de 100 por proyecto.
- **Dependencias**: cada actividad puede tener predecesoras y dependientes (por ejemplo, `[1, 2]` → `[3, 4]`).
- **Diagrama de Gantt**: visualización del cronograma con exportación a **PNG** y **PDF**.
- **Importación desde Excel**: carga masiva de actividades desde archivos `.xlsx`/`.xls` con plantilla descargable.
- **Control de acceso**: cada proyecto/actividad tiene un dueño y una lista de usuarios autorizados.
- **Autenticación**: sesiones de usuario gestionadas por Supabase (expiración de 2 días).
- **Modo demo**: sin credenciales de Supabase, la app funciona con datos de ejemplo en `localStorage`.

## Stack tecnológico

| Capa | Tecnología |
| :--- | :--- |
| Framework | [Astro](https://astro.build) |
| UI / Componentes | React 19 (islas `client:only`) |
| Base de datos / Auth | Supabase (`@supabase/supabase-js`) |
| Diagramas | Diagrama de Gantt propio + `html-to-image` / `jspdf` |
| Excel | `xlsx` |
| Iconos | `lucide-react` |
| Tests | Jest (ESM nativo) |

## Estructura del proyecto

```
├── src/
│   ├── pages/index.astro          # Única página: monta el dashboard
│   ├── layouts/Layout.astro       # Shell global (header, estilos, SEO)
│   ├── components/
│   │   ├── ProjectDashboard.jsx   # Orquestador principal (estado global de la UI)
│   │   ├── auth/AuthModal.jsx     # Login/registro con Supabase
│   │   ├── projects/              # ProjectCard, ProjectFormModal, AccessManagerModal
│   │   ├── activities/            # ActivityList, ActivityFormModal, ActivityExcelModal, GanttChart
│   │   └── ui/                    # Navbar, SqlSetupModal
│   ├── lib/
│   │   ├── supabase.js            # Cliente Supabase + helpers de sesión + datos demo
│   │   └── types.ts               # Tipos: Proyecto, Actividad, UserSession
│   └── styles/global.css          # Estilos globales
├── __tests__/                     # Tests unitarios (Jest)
├── schema.sql                     # Esquema SQL + políticas RLS para Supabase
├── jest.config.mjs / jest.setup.mjs
├── astro.config.mjs
└── package.json
```

### Cómo encaja todo

1. `src/pages/index.astro` renderiza `ProjectDashboard` como una isla de React (`client:only`).
2. `ProjectDashboard.jsx` es el **orquestador**: maneja autenticación, carga de proyectos/actividades y el estado de todos los modales.
3. Todo el acceso a datos pasa por **`src/lib/supabase.js`** (cliente único). Si Supabase no está configurado, se activa el **modo demo** con datos en `localStorage`.
4. Los componentes de `activities/` y `projects/` son presentacionales y reciben datos/handlers por props.
5. Las reglas de negocio (límite de 100 actividades, asignación automática de `id_actividad`, RLS) viven en la base de datos (`schema.sql`).

## Requisitos

- Node.js **>= 22.12.0** (requisito de Astro 7).

## Puesta en marcha

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno (copia .env.example a .env)
#    PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
#    PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
npm run dev
```

Abre `http://localhost:4321`.

### Configurar Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Copia el `URL` y la `anon key` a tu archivo `.env`.
3. Ejecuta **`schema.sql`** en el SQL Editor (tablas, trigger de `id_actividad` y políticas RLS).

> Sin `.env` configurado la app arranca igual en **modo demo**, con datos de ejemplo guardados en `localStorage`.

## Scripts

| Comando | Descripción |
| :--- | :--- |
| `npm run dev` | Servidor de desarrollo (Astro) |
| `npm run build` | Build de producción |
| `npm run preview` | Previsualizar el build |
| `npm test` | Ejecutar los tests unitarios (Jest) |

## Testing

La suite usa **Jest en modo ESM nativo** (el flag `--experimental-vm-modules` es necesario porque el proyecto es `"type": "module"`).

- Config: `jest.config.mjs`
- Polyfills de `window`/`localStorage`: `jest.setup.mjs`
- Tests actuales: `__tests__/lib/supabase.test.js` (helpers de sesión, datos demo y comportamiento SSR).

Para agregar tests de componentes React se necesitaría `@testing-library/react` y un preset de Babel para JSX.

## Convenciones

- **`@/` alias**: usa `@/` para importar desde `src/` (definido en `tsconfig.json`).
- **Separación de capas**: estructura en `pages`, `components` (presentación) y `lib` (lógica/datos). No pongas queries de base de datos en componentes Astro.
- **`src/lib/supabase.js`** es la única fuente de acceso a datos. No dupliques la conexión.
- **`src/lib/types.ts`** centraliza los tipos (`Proyecto`, `Actividad`, `UserSession`).