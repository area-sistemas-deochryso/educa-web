> **Repo destino**: `educa-web` (frontend, branch `main`) + `Educa.API` (backend, branch `master`). Cambio coordinado en ambos repos.
> **Plan**: 43 · **Chat**: 1.1 · **Fase**: F1 (Foundations) · **Creado**: 2026-05-11 · **Estado**: ⏳ pendiente arrancar.

---

# Reconciliar contadores de Correos y etiquetar `source`

## PLAN FILE

`educa-web/.claude/plan/monitoreo-cowork-feedback-2026-05-11.md` — sección **Fase 1 · Chat 1.1 — Reconciliar contadores y etiquetar `source` (A1, B11)**.

Maestro: `educa-web/.claude/plan/maestro.md` — entrada cola `🟡 Alta · Plan 43 monitoreo`.

## OBJETIVO

Hacer que los 3 widgets de la pestaña Correos (cabecera, dashboard del día, bandeja) muestren números coherentes o, si miden cosas legítimamente distintas, que el usuario entienda sin click qué cuenta cada uno. Cierra hallazgos A1 y B11 del feedback Cowork 2026-05-11.

## CONTEXTO DEL HALLAZGO (Cowork producción 2026-05-11)

Cowork detectó esta inconsistencia en producción con datos reales:

- **Cabecera Correos**: "5039 enviados hoy / 14 fallidos / 0 pendientes".
- **Dashboard del día**: "102 enviados / 0 fallidos / 0 pendientes".
- **Bandeja**: "5,119 Total / 5,039 Enviados / 14 Fallidos / 0 Pendientes".

Hipótesis a confirmar: la cabecera lee cuotas de cPanel (todo el dominio, incluye CrossChex), el dashboard del día lee solo `EmailOutbox` del sistema Educa, y la bandeja lista lo que hay en la tabla con su filtro implícito. Sin etiquetas, el usuario no puede confiar en ningún número porque no sabe contra qué compararlo.

## MODO SUGERIDO

Arrancar con `/design`. Flujo: `/design` → `/execute` → `/validate` → `/end`.

**Razón**: hay que decidir primero (a) cuáles son los 3 endpoints reales, (b) si los 3 deben coincidir o no, (c) shape del DTO unificado. Eso es decisión de contrato. Una vez claro, la implementación es directa.

## PRE-WORK OBLIGATORIO

1. **Leer la sección Chat 1.1 del plan dedicado**: `educa-web/.claude/plan/monitoreo-cowork-feedback-2026-05-11.md`.
2. **Repasar reglas que aplican**:
   - `Educa.API/.claude/rules/business-rules.md §18 Correos Salientes` + INV-MAIL01..09 (entender qué cuenta contra qué).
   - `educa-web/.claude/rules/design-system.md §B3` (anatomía stat card — los widgets siguen este patrón).
   - `educa-web/.claude/rules/pagination.md` (si la Bandeja necesita ajuste de count).
3. **Inventario empírico**: localizar los 3 endpoints que alimentan los widgets de Correos. Sugerencias:
   - `EmailOutboxController` (`Educa.API/Controllers/Sistema/`).
   - `EmailMonitoreoController` (`stats-today`, `sender-stats`, etc.).
   - Posible widget de cPanel raw (verificar si existe endpoint o si se compone client-side).

   Para cada endpoint documentar: query SQL real (o EF), filtros aplicados, ventana temporal, `EO_Estado` que incluye.

## ALCANCE

### Backend (`Educa.API`)

- **Auditar endpoints actuales** (lectura):
  - `Controllers/Sistema/EmailOutboxController.cs` — métodos que retornan contadores.
  - `Controllers/Sistema/EmailMonitoreoController.cs` — métodos `stats-today`, `sender-stats`, etc.
  - `Services/Sistema/EmailOutbox*Service.cs` y `Services/Sistema/EmailMonitoreoService.cs`.
- **Definir DTO unificado** en `DTOs/Sistema/EmailMonitoreo/OutboxCountersDto.cs` (~30 líneas):

  ```csharp
  public class OutboxCountersDto
  {
      public int Total { get; set; }
      public int Sent { get; set; }
      public int Failed { get; set; }
      public int Processing { get; set; }
      public int Pending { get; set; }
      public string Source { get; set; } = ""; // "cPanel" | "Outbox" | "OutboxFiltered"
      public DateTime WindowStart { get; set; }
      public DateTime WindowEnd { get; set; }
  }
  ```

- **Ajustar los 3 endpoints** para retornar este shape (o, si uno de ellos es legítimamente distinto, dejar shape propio pero documentar). Cap 300 líneas por archivo se respeta.
- **Tests** (`Educa.API.Tests/`):
  - Test contract por cada endpoint: shape correcto + `Source` poblado + ventana coherente.
  - Total esperado ≥ Sent + Failed + Processing + Pending (invariante de coherencia interna).

### Frontend (`educa-web`)

- **Localizar componentes** de los 3 widgets en `features/intranet/pages/admin/email-outbox/` o equivalente.
- **DTO espejo** en `data/models/email-monitoreo.models.ts` (si no existe ya).
- **Actualizar componentes**:
  - Cada widget muestra un chip pequeño con el `Source` (estilo `tag-neutral` del design-system §A1).
  - Tooltip al pasar el mouse con `windowStart - windowEnd` legible.
  - Si la decisión del `/design` es "los 3 deben coincidir", el widget que estaba mal se fixea consumiendo el endpoint correcto.
- **Tests vitest**:
  - Componente renderiza chip `Source` cuando llega DTO.
  - Snapshot con 3 widgets coherentes.

## TESTS MÍNIMOS

| Caso | Entrada | Esperado |
|------|---------|----------|
| Endpoint cabecera | GET hoy | `Source = "cPanel"` o `"Outbox"` según decisión, ventana = día actual hora Perú |
| Endpoint dashboard | GET hoy | `Source` etiquetado, números coherentes con DB |
| Bandeja sin filtro | GET | `Total = Sent + Failed + Processing + Pending` |
| Bandeja con filtro estado | GET ?estado=FAILED | `Total = Failed` (los demás 0) |
| FE chip render | DTO con `Source="cPanel"` | Chip visible con label "cPanel" |
| Smoke prod manual | abrir `/intranet/admin/monitoreo` pestaña Correos | 3 widgets con chips claros |

## REGLAS OBLIGATORIAS

### Backend (`Educa.API`)

- `AsNoTracking()` en queries de lectura (`backend.md`).
- Archivos ≤ 300 líneas (`backend.md`).
- Sufijos `*Controller.cs` / `*Service.cs` (`backend.md`).
- INV-MAIL08 — cache de monitoreo respetar TTLs existentes si se reusan métodos.
- API response: usar `ApiResponse<OutboxCountersDto>` (INV-D08).

### Frontend (`educa-web`)

- Standalone components + OnPush (`code-style.md`).
- `inject()` sobre constructores.
- Logger `@core/helpers/logger`, NO `console.*`.
- `takeUntilDestroyed` en cualquier subscripción.
- Alias `@core`, `@shared`, `@data`, `@features/*` (NO relativos `../../`).
- Design system §B3 para stat cards + §A1 para chip `tag-neutral`.
- Skeleton mientras carga (regla `skeletons.md`): `app-stats-skeleton` cuando aplique.

## APRENDIZAJES TRANSFERIBLES (del chat actual)

1. **Plan 43 es el container de los 24 hallazgos de Cowork 2026-05-11**. Vive en `plan/monitoreo-cowork-feedback-2026-05-11.md` con tabla de cierre por punto. Cada chat de Plan 43 marca su punto al cerrar.

2. **Foundations primero, no UI primero**. El plan organiza 6 fases: F1 (contadores + fingerprint + correlation id), F2 (quick wins), F3 (SMTP visible), F4 (filtros + acciones), F5 (visualizaciones), F6 (vista unificada). Muchos hallazgos comparten causa raíz; resolver de raíz cierra 3-5 puntos al mismo tiempo.

3. **Este chat (1.1) NO depende de nada**. Puede correr en paralelo con Chat 1.2 (fingerprint), Chat 1.3 (correlation id) y Chat 2.1 (quick wins). Los 4 son foundations independientes.

4. **El feedback Cowork tenía 3 widgets observados**, pero el plan asume que pueden ser legítimamente distintos (cPanel raw vs Outbox del sistema vs Outbox filtrado). Decisión queda en el `/design` de este chat. Si los 3 deben coincidir → fixear el roto. Si miden cosas distintas → 3 chips bien etiquetados.

5. **No mezclar este trabajo con Chat 5.1 (trend 30d)**. Chat 5.1 depende de este pero es otro chat. Aquí solo se reconcilia el "ahora", el histórico viene después.

6. **CrossChex comparte SMTP del dominio con Educa** (ver Plan 29 + project_smtp_defer_fail_block memory). Esto significa que la cabecera "cPanel" puede contar correos de CrossChex que el sistema Educa NO conoce. Es válido y útil tenerlo separado del "Outbox" del sistema.

7. **Coordinar repos**: el plan dedicado prevé este chat tocando ambos repos. El BE debe shippear primero o en el mismo PR/coordinado, porque el FE depende del DTO. El BE termina ANTES del FE en el orden de commits.

## FUERA DE ALCANCE

- ❌ Trend 30d / sparklines (eso es Chat 5.1, depende de este).
- ❌ Filtros nuevos en Bandeja (eso es Chat 4.1).
- ❌ Acciones inline (Chat 4.3).
- ❌ Vista por destinatario (Chat 6.1).
- ❌ Tocar el módulo Errores / Reportes de Usuario / Auditoría (otros chats de Plan 43 o de otros planes).
- ❌ Refactor oportunístico de los services de email monitoreo más allá del DTO unificado.
- ❌ Tocar `INV-MAIL08` (cache) salvo para reusar métodos cacheados existentes.

## VALIDACIÓN FINAL

```bash
# Backend
cd Educa.API/Educa.API
dotnet build  # 0 errores, 0 warnings nuevos
dotnet test   # Suite debe quedar verde (sumar los tests nuevos, no perder verdes existentes)

# Frontend
cd educa-web
npm run lint       # 0 errores nuevos
npm test           # suite vitest verde con tests nuevos
npm run build      # build OK
```

**Smoke manual local** (después de levantar BE + FE):
1. Login como Director.
2. Abrir `/intranet/admin/monitoreo`, pestaña Correos.
3. Verificar que los 3 widgets muestran chip `Source` legible.
4. Hover sobre cada chip → ver tooltip con ventana temporal.
5. Si la decisión fue "los 3 deben coincidir", validar contra `SELECT COUNT(*) FROM EmailOutbox WHERE EO_FechaReg >= CONVERT(date, GETDATE())`.

## CRITERIOS DE CIERRE

- [ ] Validación final pasa (lint + build + tests + smoke local).
- [ ] Maestro actualizado: cambiar Plan 43 de 0% a ~8% (1 de 13 chats) + remover este item de la cola.
- [ ] Tabla de cierre por punto en `plan/monitoreo-cowork-feedback-2026-05-11.md`: marcar A1 y B11 como ✅.
- [ ] Brief movido `running/` → `awaiting-prod/` (espera smoke prod del usuario).
- [ ] Commit final único en cada repo (BE primero, FE después).

## COMMIT MESSAGE sugerido

**Backend** (Conventional Commits, EN, ≤72 chars):

```
feat(email-monitoreo): unify outbox counters with explicit source label

Add OutboxCountersDto with source/window fields so the 3 monitoring
widgets (header, daily dashboard, inbox) report coherent numbers or
clearly distinguish their scope. Closes A1+B11 of Plan 43 Cowork
feedback 2026-05-11.
```

**Frontend** (Conventional Commits, EN, ≤72 chars):

```
feat(monitoreo): render source chip on email counter widgets

Consume the unified OutboxCountersDto and show a source chip ("cPanel"
| "Outbox" | "OutboxFiltered") plus window tooltip on the 3 widgets of
the Correos tab. Closes A1+B11 of Plan 43.
```

Idioma inglés, modo imperativo, sin `Co-Authored-By` (regla `commit-style.md` + skill `commit`).

## CIERRE

Al cerrar, pedir feedback al usuario:

1. **¿Los 3 chips legibles desde producción?** Pegar screenshot del módulo Correos con los 3 widgets visibles.
2. **¿La decisión "los 3 son distintos" o "deben coincidir" se mantuvo correcta a la luz de los datos reales?**
3. **¿Algún chip o tooltip necesita ajuste de naming antes de pasar a Chat 1.2 (fingerprint)?**

Recordar al usuario: agregar al final de la cola del maestro el siguiente chat de Plan 43 si Chat 1.2 no se va a arrancar ya en paralelo.
