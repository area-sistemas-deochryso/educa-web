> **Repo destino**: `educa-web` (frontend, branch `main`) — y posiblemente `Educa.API` si la causa raíz vive en el BE.
> **Plan**: 36 · **Chat**: 8b · **Fase**: Investigar local + fix · **Creado**: 2026-04-28 · **Estado**: ⏳ pendiente arrancar.
> **Modo sugerido**: `/investigate` → `/design` → `/execute`.
> **Deriva de**: [`063-plan-36-chat-8-fe-rate-limit-events-intentos-umbral.md`](../awaiting-prod/063-plan-36-chat-8-fe-rate-limit-events-intentos-umbral.md) (awaiting-prod).

---

# Plan 36 Chat 8b FE — Rate Limit Events: investigar y arreglar `intentos / umbral` en prod

## CONTEXTO

El Chat 8 (brief 063) agregó la columna `INTENTOS / UMBRAL` a la tabla de `/intranet/admin/monitoreo/seguridad/rate-limit`. **En prod la columna aparece pero los valores muestran `— / —`** (guiones) en todas las filas observadas. Adicionalmente la página muestra el banner `⚠️ No se pudieron cargar los eventos` aunque la tabla sí pinta filas (estado mixto).

Screenshot de prod (2026-04-28) confirma:
- Cards superiores: `Total eventos = 0`, `Rechazados = 0`, `Top rol — sin datos`, `Top endpoint — sin datos` (todo 0/sin datos pese a haber filas en la tabla).
- Columna `INTENTOS / UMBRAL` renderizada pero con `— / —` en cada fila.
- Filas reales observadas: `POST /api/Auth/switch-session/...` con `policy = global`, `RECHAZADO = SI`, `IP = ::1` (loopback, raro en prod), `Anónimo`, `DNI = ***`.
- Banner amarillo `No se pudieron cargar los eventos` simultáneo con tabla poblada.

## OBJETIVO

Reproducir el escenario localmente, identificar la causa raíz del `— / —` y del banner inconsistente, y entregar el fix. Posibles capas afectadas: BE (DTO sin campos), FE (mapping incorrecto), o telemetría (cálculo fallido para eventos anónimos / loopback).

## HIPÓTESIS A DESCARTAR (no implementar a ciegas)

1. **BE no devuelve `intentos` / `umbral` / `lapsoSegundos` en `RateLimitEventDto`** — el Chat 8 asumió que estaban y no estaban. → Verificar `Educa.API/DTOs/Sistema/RateLimitEventDto.cs` actual en master.
2. **BE devuelve los campos pero el FE no los lee** — naming mismatch (`intentos` vs `attempts`, camel vs PascalCase). → Verificar `@data/models/rate-limit-event.models.ts` y serialización JSON del BE.
3. **BE los calcula pero devuelve `null` cuando el evento es anónimo o loopback** — el cálculo depende de `userId` y para anónimos cae a IP, pero `::1` puede no estar bien manejado. → Inspeccionar lógica en el service BE que arma el DTO.
4. **El banner `No se pudieron cargar los eventos` es ruido de un endpoint paralelo** — la tabla carga del listado, las cards de un `/stats` separado que falla. → Verificar qué endpoints consume la página, separar errores.
5. **Falla del endpoint paralelo causa rate-limit del propio admin** (toast `Demasiadas solicitudes, podrás reintentar en 54 segundos` visible en screenshot). → Reintentos descontrolados en algún facade/effect.

## PRE-WORK OBLIGATORIO (antes de tocar código)

1. `git log --oneline -- Educa.API/DTOs/Sistema/RateLimitEventDto.cs` y abrir el archivo actual.
2. `git log --oneline -- src/app/data/models/rate-limit-event.models.ts` (o equivalente — confirmar path real con grep).
3. `git log --oneline -- src/app/features/intranet/pages/admin/rate-limit-events/` para entender qué tocó el Chat 8 exactamente.
4. Reproducir local: levantar BE + FE, generar un 429 (ej: spamear login), abrir la página y observar en DevTools la response del listado y de stats. Confirmar shape real vs esperado.

## RESTRICCIONES

- No empujar fix a prod sin reproducir local primero.
- Si la causa raíz es BE, derivar Chat 8c BE en `Educa.API` (no parchar en FE con defaults).
- No tocar lógica de filtros / carga existente más allá de lo necesario.
- Si la causa raíz es el banner inconsistente (hipótesis 4), separar el manejo de error de la tabla y de las cards (no compartir `loading`/`error` global).

## REGLAS

- [`rules/design-system.md`](../../rules/design-system.md) §B4 (tabla).
- [`rules/state-management.md`](../../rules/state-management.md) (separar error de tabla vs cards).
- [`rules/business-rules.md`](../../rules/business-rules.md) §15.5 INV-S07 (errores de telemetría no rompen flujos).

## VALIDACIÓN

- Local: `npm run lint` · `npm run build` · `npm test`.
- Local: reproducir un 429 real, ver columna con valores reales (no guiones).
- Local: provocar fallo de un endpoint y verificar que el banner solo aparece para la sección que falló.

## POST-DEPLOY GATE

Sí — verificar en prod con un 429 real (ya hay tráfico que los genera, o forzar uno).

## DECISIÓN PENDIENTE PARA EL ARRANQUE DE 063

063 sigue en `awaiting-prod/` con la columna implementada pero datos vacíos. Cuando 064 entregue el fix, decidir:
- Si 063 + 064 deployan juntos → `/verify 063` ✅ tras verificar que la columna ya muestra datos reales en prod post-fix.
- Si 064 reemplaza el scope de 063 → cerrar 063 con nota "absorbido por 064".
