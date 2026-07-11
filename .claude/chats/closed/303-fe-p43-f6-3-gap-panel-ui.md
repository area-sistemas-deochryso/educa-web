# 303 — P43 F6.3 FE: Gap panel UI (filter, links, export)

> **Created**: 2026-06-04
> **Plan**: [xrepo-43](../../../../../educa-coord/plans/xrepo-43-monitoreo-cowork-feedback-2026-05-11.md) §F6.3
> **Repo**: educa-web
> **Depends on**: brief 302 (P43 F6.3 BE — DTO enrichment deployed)
> **Mode**: `/execute` → `/validate`

---

## Objective

Complete the gap panel from brief 297 §1 (deferred because BE lacked `salonId`, `estudianteId`, `salonNombre`).

## Contract (from brief 302 BE)

`GET /api/sistema/email-outbox/asistencias-sin-correo?fecha=YYYY-MM-DD`

Each item now returns:

```typescript
interface AsistenciaSinCorreo {
  alumno: string;          // "PÉREZ GARCÍA, Juan"
  grado: string;           // "4to Primaria"
  tipo: string;            // "Entrada" | "Salida"
  horaRegistro: string;    // "07:45"
  outboxId: number | null;
  outboxEstado: string | null;
  // --- NEW from brief 302 ---
  estudianteId: number;
  salonId: number;
  salonNombre: string;     // "4to A"
}
```

**Assume this contract is live.** If the BE fields are missing at runtime, show the table without filter/links (graceful degradation).

## Implementation

### 1. Salon filter (multiselect)
- Extract unique `salonId + salonNombre` pairs from the response
- Chip-based multiselect filter above the gap table
- Default: all salons selected
- Filter is client-side (data already loaded)

### 2. Student profile links
- Each row: "Ver perfil" link → `/intranet/estudiantes/:estudianteId`
- "Sin rastro en outbox" rows (outboxId null): highlight + link to student profile

### 3. Export Excel
- Button "Exportar Excel" above the table
- Export visible (filtered) rows: Alumno, Grado, Salón, Tipo, Hora, Estado outbox
- Use existing XLSX export utility if available, otherwise SheetJS/xlsx

## Validation

- [ ] lint: 0 errors, 0 warnings
- [ ] tsc --noEmit: clean
- [ ] Browser: filter by salon works, links navigate correctly, export downloads
