---
exclusive: false
isolation: worktree
touches:
  - src/app/shared/edu-ui/lib/table/edu-table.ts
hot-paths: []
---

> **Repo destino**: `educa-web` (frontend, branch `main`). Abrir el chat nuevo en este repo.
> **Plan**: [`plan/motion-expresivo.md`](../../plan/motion-expresivo.md) (F11) · **Chat**: 4 · **Fase**: F4 · **Creado**: 2026-11-19 · **Estado**: ✅ cerrado local, pendiente verificación manual en vivo.
> **Validación prod**: ✅ verificada 2026-11-20 — local con BBDD de prueba: medición en vivo + visto por el usuario
> **Nota posterior (2026-11-20)**: la verificación no vio que el pliegue del hueco nunca arrancaba (Angular prefija los keyframes y `playRowExit` comparaba el nombre sin prefijo; el test unitario usaba el nombre sin prefijo). Corregido en `af6d296c` con test de regresión (comprobado: falla sin el arreglo). Detalle en `plan/motion-expresivo.md`.
> **Created**: 2026-11-19
> **MODO SUGERIDO**: `/investigate` → `/design` → `/execute` → `/validate` (la salida con pliegue de fila requiere decidir mecanismo).
> **modules**: `ui` (motion, `edu-table`).

---

# F11 F4 — Filas: destello, rebote y salida con pliegue

## PLAN FILE

[`plan/motion-expresivo.md`](../../plan/motion-expresivo.md) — fase F4 (`depends_on: [F1]`). F1 ✅ (943), F2 ✅ (944), F3 ✅ (945, commit `89ab9409`), todas en `awaiting-prod/`. El plan guarda intención; no seguir rutas o firmas que mencione.

## OBJETIVO

1. **Destello del fondo + rebote del valor** cuando una fila cambia (`.motion-flash`, `.motion-value-bounce` de F1).
2. **Salida deslizante seguida de pliegue del hueco** cuando una fila se quita de `edu-table`, sin que el resto de la lista salte.

## HALLAZGOS PREVIOS

- `edu-table.ts:80` renderiza con `@for (row of value(); track trackByFn(row, $index))`. La identidad de fila ya viene de `trackBy` / `dataKey` (`:122`, `:199`), así que detectar "fila cambiada" y "fila quitada" puede apoyarse en esa clave.
- Salida: `@for` quita el nodo de inmediato; animar la salida exige retener la fila (`animate.leave` de Angular o un estado de "saliendo"). **Decidir en `/design`**.
- Pliegue del hueco: es la excepción de `transform`/`opacity` del plan (colapsa altura); justificarla en el diseño.
- Qué cuenta como "fila cambió": comparar por identidad de objeto vs. valor de columnas. Definir sin disparar destello en cada recarga completa.

## PRE-WORK OBLIGATORIO

- Leer `src/_motion-expressive.scss` (`.motion-flash`, `--motion-flash-color`, `.motion-value-bounce`) y `edu-table.ts` completo.
- Grep de consumidores de `edu-table` que muten filas in-place (WAL / optimistic UI) para dimensionar el efecto (`reference/optimistic-ui.md`).
- Probar en `/intranet/admin/cursos` y `/intranet/asistencia` (páginas piloto del plan).

## REGLAS OBLIGATORIAS

- Tokens y utilidades de F1 (sin ms ni distancias literales). Fill-mode `backwards`, nunca `both`/`forwards`.
- Solo `transform`/`opacity`/color, salvo el pliegue de altura justificado.
- Reduced-motion: el global anula duración; la fila quitada no debe quedar visible ni bloquear la lista.
- Sin destello al cargar la tabla ni al paginar/ordenar/filtrar; solo ante cambio puntual de fila.
- Copia vendored de `edu-ui` es la fuente única (brief 942). Cap 300 ln (`edu-table.ts` está cerca: extraer si hace falta).
- Standalone, OnPush, signals, `inject()`. Código en inglés, UI en español, comentarios en español concisos.
- Compatible hacia atrás: tablas sin cambios de filas se ven igual.

## TESTS MÍNIMOS

- Spec: fila con valor modificado recibe `motion-flash`; carga inicial y reordenado no.
- Spec: fila quitada se mantiene hasta terminar la salida y luego desaparece del DOM.
- Verificación manual en las dos páginas piloto; `prefers-reduced-motion: reduce`.

## FUERA DE ALCANCE

- Toast (F5), acordeón (F6), modales (F7/F8), router (F9), botón (F2), campos (F3).
- Migrar consumidores a otro patrón de mutación.

## VALIDACIÓN FINAL

- [ ] `npm run lint` sin errores nuevos.
- [ ] `npm run build` pasa.
- [ ] Tests de `edu-table` en verde.
- [ ] Done-when del plan: quitar una fila se anima y el resto no salta.

> **Nota de entorno**: lint/build no corren con Node de Windows v20.19.6 (CLI pide ≥ 22.22.3). Tests: `cmd.exe /c "npm run test -- <ruta>"`; typecheck: `cmd.exe /c "node node_modules\typescript\bin\tsc -p tsconfig.app.json --noEmit"`. `edu-ui` está ignorado por ESLint.

## CRITERIOS DE CIERRE

- [ ] Validación final pasa.
- [ ] Maestro actualizado (fila F11 con F4 ✅).
- [ ] Brief movido a `awaiting-prod/` o `closed/`.
- [ ] Commit final único con código, move del brief y maestro.

## COMMIT MESSAGE sugerido

```
feat(ui): animate changed and removed rows in edu-table
```

Inglés, imperativo, ≤ 72 caracteres, sin `Co-Authored-By`.

## CIERRE

Pedir al usuario que revise en vivo `/intranet/admin/cursos` y `/intranet/asistencia`: editar una fila (destello + rebote) y quitar una (salida + pliegue).
