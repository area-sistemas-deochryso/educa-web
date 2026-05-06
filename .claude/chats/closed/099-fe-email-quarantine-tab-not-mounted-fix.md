# 099 · FE · Tab Cuarentena no monta en `/intranet/admin/monitoreo/correos/cuarentena` (fix de 068)

> **Repo destino**: `educa-web` (main)
> **Estado**: ⏳ pendiente arrancar
> **Creado**: 2026-05-04 · **Modo sugerido**: `/investigate` → `/execute`
> **Origen**: smoke Cowork 2026-05-04 caso EM-4 ❌

## Hallazgo

URL `/intranet/admin/monitoreo/correos/cuarentena` **redirige a la home pública** en producción. Sub-tabs efectivamente visibles en `correos-shell`:

- Bandeja
- Dashboard del día
- Diagnóstico
- Auditoría
- Blacklist

**Falta**: Cuarentena. (Y posiblemente Dominios pausados / Eventos de defer si fueron del mismo Plan 37 Chat 3.)

El BE responde correctamente:

```
GET /api/sistema/email-quarantine 200 OK
```

→ El bug es **frontend exclusivo**: routing/menú/feature-flag/permiso bloqueando el mount del tab.

## Hipótesis a investigar

1. **Feature flag**: `environment.features.emailQuarantine` (o equivalente) está en `false` en `environment.ts`. Plan 37 Chat 3 lo declaró pero no lo activó para prod.
2. **Permiso requerido no asignado**: el tab tiene `requiredPermission` que ni el rol Director ni el override personal del usuario incluyen.
3. **Ruta no registrada**: el `correos-shell.routes.ts` (o el children del shell) no incluye el path `cuarentena`. La redirección a home es el fallback del wildcard `**`.
4. **Lazy chunk roto**: el `loadComponent` apunta a un path que no existe en el bundle de prod. Network tab debería mostrar 404 del chunk `.js`.

## Repro mínimo

1. Login Director.
2. Navegar a `/intranet/admin/monitoreo/correos`. Confirmar las 5 tabs visibles.
3. Click manual o URL directa a `/intranet/admin/monitoreo/correos/cuarentena`.
4. Confirmar redirect a home pública.
5. Network tab: buscar 404 de chunk JS o redirect 302 desde el guard.
6. Console: ver mensajes de `Router` (filtro `[Router]` o `NavigationStart`).

## Scope del fix

**Investigate**:
- Leer `correos-shell.component.html` y su `*.routes.ts`.
- Leer `intranet-menu.config.ts` buscando entrada de Cuarentena.
- Leer `environment.ts` y `environment.development.ts` buscando flag.
- Comparar con la rama del Plan 37 Chat 3 (commit del FE en 068) — qué se mergeó y qué quedó dormido.

**Execute**:
- Activar feature flag si aplica.
- Registrar ruta en el shell si falta.
- Asignar permiso al rol Director si aplica.
- Probar la nueva ruta en dev antes de pushear.

## Tests

- Smoke browser caso EM-4 debe pasar tras el fix.
- Spec del shell que verifique las tabs registradas matcheen las routes.

## Notas

- Cowork confirmó que `EM-4` quedaba ❌ por **el tab solamente**. Backend está sano. Esto reduce el scope al routing/menú FE.
- Probable que el mismo issue afecte tabs hermanas del Plan 37 (dominios pausados, eventos de defer) — verificar y reportar.

## Referencias

- Brief original: `closed/068-plan-37-chat-3-fe-quarantine-admin-visibility.md`.
- Shell: `src/app/features/intranet/pages/admin/monitoreo/correos-shell/` (ubicación tentativa).
- Reglas: `rules/feature-flags.md`, `rules/permissions.md`.

---

## ✅ Cerrado como falso positivo 2026-05-06

Smoke Cowork (`claude-cowork/post-deploy-2026-05-06.md` CASO 099):

La URL canónica del tab Cuarentena es `/intranet/admin/monitoreo/correos/quarantine` (EN), declarada en `monitoreo.routes.ts:76` con `path: 'quarantine'`. **Nunca existió alias `/cuarentena` (ES)** en el routing FE. Que `/cuarentena` redirija a home es comportamiento correcto (404 → fallback).

El tab monta correctamente desde la URL `/quarantine` y desde el shell de pestañas internas. El backend tiene un bug separado de path mismatch (`email-quarantine` vs `email-outbox/quarantine`) que se aborda en el brief 114.

No hay acción correctiva sobre 099. Se cierra sin cambios.
