# Graph Report - GestionProyectos  (2026-10-22)

## Corpus Check
- 45 files · ~20,318 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: .log 1, .example 1, (none) 1)

## Summary
- 216 nodes · 440 edges · 19 communities (11 shown, 8 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 8 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `032c6a62`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- package.json
- ProjectDashboard.jsx
- content.d.ts
- curvaS.js
- TaskFlow Pro
- dependencies
- diasHabiles.js
- compilerOptions
- wait-for-astro-dev.mjs
- Layout.astro
- jest.setup.mjs
- env.d.ts
- graphify knowledge graph
- dependencias.js
- scripts

## God Nodes (most connected - your core abstractions)
1. `ProjectDashboard()` - 30 edges
2. `lucide-react` - 16 edges
3. `react` - 16 edges
4. `calcularTraslapes()` - 11 edges
5. `contarHabiles()` - 11 edges
6. `calcularPuntoEnFecha()` - 9 edges
7. `reprogramarDependientes()` - 9 edges
8. `moverBarra()` - 9 edges
9. `TaskFlow Pro` - 9 edges
10. `scripts` - 8 edges

## Surprising Connections (you probably didn't know these)
- `ProjectDashboard()` --calls--> `ActivityExcelModal()`  [EXTRACTED]
  src/components/ProjectDashboard.jsx → src/components/activities/ActivityExcelModal.jsx
- `ProjectDashboard()` --calls--> `ActivityFormModal()`  [EXTRACTED]
  src/components/ProjectDashboard.jsx → src/components/activities/ActivityFormModal.jsx
- `ProjectDashboard()` --calls--> `ActivityList()`  [EXTRACTED]
  src/components/ProjectDashboard.jsx → src/components/activities/ActivityList.jsx
- `ProjectDashboard()` --calls--> `CurvaS()`  [EXTRACTED]
  src/components/ProjectDashboard.jsx → src/components/activities/CurvaS.jsx
- `ProjectDashboard()` --calls--> `GanttChart()`  [EXTRACTED]
  src/components/ProjectDashboard.jsx → src/components/activities/GanttChart.jsx

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Data layer: supabase.js, schema.sql, types.ts** — src_lib_supabase, readme_schema_sql, src_lib_types [INFERRED 0.85]

## Communities (19 total, 8 thin omitted)

### Community 0 - "package.json"
Cohesion: 0.06
Nodes (27): allowScripts, core-js@3.50.0, esbuild@0.25.12, esbuild@0.28.2, unrs-resolver@1.12.2, devDependencies, astro, jest (+19 more)

### Community 1 - "ProjectDashboard.jsx"
Cohesion: 0.18
Nodes (22): lucide-react, react, xlsx, AuthModal(), ProjectDashboard(), AccessManagerModal(), aFecha(), FestivosModal() (+14 more)

### Community 2 - "content.d.ts"
Cohesion: 0.07
Nodes (25): AllValuesOf, astro:content, CollectionEntry, CollectionKey, ContentConfig, DataEntryMap, ExtractCollectionFilterType, ExtractDataType (+17 more)

### Community 3 - "curvaS.js"
Cohesion: 0.20
Nodes (21): ActivityList(), barraAvance(), formatList(), AvanceRealModal(), ordenar(), CurvaS(), hoyActualStr(), avanceProgramadoActividad() (+13 more)

### Community 4 - "TaskFlow Pro"
Cohesion: 0.15
Nodes (15): Per-project access control (RLS), Activity dependencies (predecessors/successors), Astro framework, Demo mode (localStorage), Excel import of activities, Gantt chart (PNG/PDF export), Jest ESM testing, ProjectDashboard.jsx orchestrator (+7 more)

### Community 5 - "dependencies"
Cohesion: 0.20
Nodes (10): dependencies, @astrojs/react, clsx, html-to-image, jspdf, lucide-react, react, react-dom (+2 more)

### Community 6 - "diasHabiles.js"
Cohesion: 0.42
Nodes (12): GanttChart(), PlazoProyectoModal(), contarHabiles(), diasCalendario(), esHabil(), habilMasCercano(), moverBarra(), setFestivos() (+4 more)

### Community 7 - "compilerOptions"
Cohesion: 0.25
Nodes (7): astro/tsconfigs/strict, compilerOptions, baseUrl, jsx, jsxImportSource, paths, extends

### Community 8 - "wait-for-astro-dev.mjs"
Cohesion: 0.40
Nodes (3): checkReady(), child, waitUntilReady()

### Community 17 - "dependencias.js"
Cohesion: 0.28
Nodes (16): ActivityExcelModal(), ActivityFormModal(), clampAvance(), addDays(), calcularTraslapes(), construirAristas(), diffDays(), fechasParaTraslape() (+8 more)

### Community 18 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, astro, build, dev, preview, start, test, test:e2e

## Knowledge Gaps
- **10 isolated node(s):** `clsx`, `react-dom`, `@types/react`, `@types/react-dom`, `jest` (+5 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 89 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `lucide-react` connect `ProjectDashboard.jsx` to `package.json`, `dependencias.js`, `curvaS.js`, `diasHabiles.js`?**
  _High betweenness centrality (0.090) - this node is a cross-community bridge._
- **What connects `clsx`, `react-dom`, `@types/react` to the rest of the system?**
  _10 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06451612903225806 - nodes in this community are weakly interconnected._
- **Why does `react` connect `ProjectDashboard.jsx` to `package.json`, `dependencias.js`, `curvaS.js`, `diasHabiles.js`?**
  _High betweenness centrality (0.090) - this node is a cross-community bridge._
- **Should `content.d.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07407407407407407 - nodes in this community are weakly interconnected._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._