# 730 — P77-F7 (derivado) — Alinear `NODE_VERSION` de Netlify con el mínimo de Angular 22

> **Origen**: educa-coord chat 729 (P77 F7) · 2026-09-29
> **Repo afectado**: `educa-web`
> **Plan**: `educa-coord/plans/xrepo/060-079/xrepo-77-test-suite-reliability-audit.md` · findings `xrepo-77-f2-findings.md` §2
> **Created**: 2026-09-29
> **Validación prod**: ⏳ pendiente desde 2026-09-29 (primera build Netlify con Node 22)
> **MODO SUGERIDO**: `/execute` (fix mecánico; verificar antes el valor vigente)
> **exclusive**: `false`
> **modules**: `deploy`
> **touches**:
>   - `educa-web`: `netlify.toml`

## Contexto

F2 encontró que el build que Netlify despliega a producción corre en Node 20, por debajo del mínimo que declara Angular 22 (`engines: ^22.22.3 || ^24.15.0 || >=26.0.0`), mientras CI valida en Node 22. Un CI verde no garantiza que el ambiente que construye el artefacto de producción sea el mismo que CI verificó.

## Scope

- Subir `NODE_VERSION` en `netlify.toml` a un valor que cumpla el `engines` de Angular 22 y coincida con lo que CI ya valida. Confirmar los valores actuales antes de cambiar (pueden haber cambiado desde 2026-09-28).
- Considerar si `ci.yml` debe fijar el mismo valor exacto para evitar nuevo drift.

## Fuera de scope

- Hacer que Netlify espere el resultado de CI (descartado en el diseño de F7: cambia todo el proceso de deploy).

## Criterio de cierre

- [ ] `netlify.toml` y `ci.yml` declaran versiones de Node coherentes entre sí y con `engines` de Angular.
- [ ] Build local con esa versión OK (lint + build + tests).
- [ ] Recordar: push a `main` = deploy automático. Trabajar en rama y validar el deploy de preview si aplica.
