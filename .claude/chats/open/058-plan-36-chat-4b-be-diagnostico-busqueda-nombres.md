> **Repo destino**: `Educa.API` (backend, branch `master`). Abrir el chat en este repo.
> **Plan**: 36 · **Chat**: 4b · **Fase**: F4.BE (`/design + /execute`) · **Creado**: 2026-04-27 · **Estado**: ⏳ pendiente arrancar · **Bloquea**: Chat 4 FE (059).

---

# Plan 36 Chat 4b BE — Búsqueda de diagnóstico por nombre/apellidos

## PLAN FILE

[`../educa-web/.claude/plan/monitoreo-pages-redesign.md`](../../../educa-web/.claude/plan/monitoreo-pages-redesign.md) · página #3 (Diagnóstico).

## OBJETIVO

Hoy `GET /api/sistema/email-outbox/diagnostico?correo={email}` solo busca por correo exacto. El usuario pidió **buscar por apellidos y nombres** además del correo. Extender el endpoint o agregar uno nuevo que haga lookup polimórfico en `Estudiante`/`Profesor`/`Director`/`Apoderado` por `nombres LIKE %term%` o `apellidos LIKE %term%`, devuelva las personas matchadas con sus correos enmascarados, y permita que el FE elija un correo específico para llamar al endpoint actual de diagnóstico.

## DECISIONES DE DISEÑO ABIERTAS

1. ¿Extender `/diagnostico?correo=` para aceptar también `?q=` con texto libre? O ¿endpoint nuevo `/diagnostico/buscar-personas?q=`?
2. ¿Devolver lista de personas con correo o ya disparar el diagnóstico completo del primer match?
3. ¿Cap de resultados? Sugerencia: 10 (typeahead-friendly).
4. ¿Búsqueda por DNI también? (el usuario no lo pidió — confirmar).

## PRE-WORK SQL OBLIGATORIO

Antes de codear, mostrar al usuario `SELECT TOP 5` de cada tabla persona con los campos `_Nombres` / `_Apellidos` / `_Correo*` / `_DNI` para confirmar el shape real antes de escribir el service. Ver `feedback_db_select_first.md`.

## RESTRICCIÓN

- DNI **siempre enmascarado** (`DniHelper.Mask`) en respuesta.
- Correo enmascarado tipo `EmailHelper.Mask`.
- Respetar [`backend.md`](../../educa-web/.claude/rules/backend.md) cap 300 líneas, structured logging, fail-safe INV-S07.

## VALIDACIÓN

`dotnet build` · `dotnet test` · tests nuevos para los 4 tipos de persona + universo vacío + INV-S07.

## POST-DEPLOY GATE

Sí — el FE Chat 4 (059) consume este endpoint, así que necesita estar deployado y validado antes.
