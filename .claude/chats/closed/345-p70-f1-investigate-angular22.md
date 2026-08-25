# 345 — Investigate Angular 22 compatibility

> **Plan**: `../../../educa-coord/plans/xrepo-70-angular22-migration.md` (P70)
> **Worktree**: `EducaWeb/WT/educa-web/p70-angular22-migration`, branch `chat/p70-angular22-migration` (dedicado, sobrevive el cierre de fases individuales — merge semanal desde `main`)
> **Creado**: 2026-06-24 · **Delegado a educa-web**: 2026-08-21 · **Cerrado**: 2026-08-25 · **Estado**: ✅ cerrado.
> **MODO SUGERIDO**: `/investigate`
> **exclusive**: `true`
> **touches**: `package.json`, `angular.json`, `src/**`

## Nota de scope (2026-08-21)

Este brief cubría originalmente Angular 22 **y** PrimeNG 22. Se separó: PrimeNG está siendo reemplazado por una librería propia (**P79**, `educa-coord/plans/xrepo-79-primeng-replacement-library.md`, diseñado desde 2026-07-02, target repo `educa-libs`), motivado por el cambio de licenciamiento de PrimeNG v22 (closed-source, modelo dual Community/Commercial, repo archivado 2026-06-28). Este brief queda **solo Angular 22**.

## Activation gate

Ninguno.

## Scope

Map the full landscape before designing the migration:

### 1. Stable API changes (priority: first)
- Which Angular 21 experimental APIs are now stable in v22?
- Signal Forms: current reactive forms usage in educa-web vs Signal Forms API
- httpResource / rxResource: current HTTP patterns vs new resource APIs
- Angular Aria: accessibility patterns in use

### 2. Efficiency & readability gains
- APIs that produce less code or clearer intent vs current patterns
- OnPush default implications for existing component tree
- Zoneless consolidation impact

### 3. Breaking changes & incompatibilities
- Third-party library compatibility (list all FE deps, check Angular 22 support) — **excluye PrimeNG**, cubierto por P79
- XHR → Fetch migration: interceptor audit
- TypeScript 6.0 compatibility

### 4. Philosophical / architectural shifts
- Framework direction signals for long-term alignment
- Patterns deprecated or discouraged going forward

## Out of scope

- Actual code changes (this is investigation only)
- Backend changes
- New feature development
- PrimeNG (ver P79 en `educa-libs`)

## Deliverable

A structured report per section (1-4) with:
- What changed
- Impact on educa-web (none / low / medium / high)
- Recommended action (adopt now / adopt later / ignore / requires design)

This report feeds the `/design` phase (F2).

## Criterio de cierre

- [x] All four investigation sections completed
- [x] Third-party dependency compatibility matrix built (sin PrimeNG)
- [x] Report written and ready for F2 design phase

## Tiempo estimado

~60 min investigation + report.

## Deliverable

Ver [`345-report.md`](./345-report.md) — reporte completo con las 4 secciones, matriz de compatibilidad y recomendación consolidada para F2.
