# Brief 204 — FE Asistencia manual: modal "Registrar asistencia manual" debe pedir `personas` con `search` server-side (no client-side sobre payload truncado)

> **Creado**: 2026-05-19 · **Estado**: ⏳ pendiente arrancar · **Modo sugerido**: `/investigate` → `/execute`
> **Repo**: `educa-web` (FE)
> **Severidad**: Medio
> **Relacionado**: educa.API brief 203 (mitigación BE ya aplicada — `Take(100)` → `Take(500)` por tipo + final `Take(200)` → `Take(1000)`). Este brief es el fix definitivo del lado FE.

## Síntoma

En `/intranet/admin/asistencias?tab=gestion` → modal **"Registrar asistencia manual"** → tipo Estudiante:

- Buscar por apellido (ej. `yauri`) → "No results found" aunque el estudiante exista y esté activo.
- Confirmado por DevTools: el modal hace **1 GET a `personas?tipoPersona=E`** al abrirse y luego busca client-side sobre el array recibido.
- Si el estudiante buscado cae fuera del payload inicial (apellidos al final del alfabeto en sedes con muchos activos), no aparece nunca.

## Causa raíz

El endpoint backend `GET /api/asistencias-admin/personas?tipoPersona=...` ordena `EST_Apellidos` ASC y devuelve un subset. La búsqueda al tipear es 100% client-side y no dispara nuevas requests. Para sedes con >500 estudiantes activos, apellidos como `Yauri`/`Zambrano`/etc. quedan fuera del payload.

Hasta el brief 203, el cap era 100; ahora es 500 (mitigación). El fix definitivo es que el FE deje de hacer 1-shot client-search y pase a server-side search.

## Comportamiento esperado

1. Al abrir el modal: 1 request inicial con `search` vacío → muestra top-N (BE devuelve hasta 500/tipo, alfabético por apellido).
2. Al tipear en el dropdown (debounce ~250-300ms): nueva request `personas?tipoPersona=E&search=<query>` → reemplaza el array del dropdown con los resultados del server.
3. UX: spinner inline en el dropdown mientras la request está en vuelo. Mantener UX existente de "no results" cuando server devuelve vacío.

## Endpoint a consumir

```
GET /api/asistencias-admin/personas?tipoPersona={E|P|A}&search=<query>&sedeId=<opcional>
```

Ya implementado en BE. Acepta `search` desde antes del brief 203 (se aplica con `EST_Nombres.Contains(search) || EST_Apellidos.Contains(search)`).

## Pasos sugeridos

1. **Localizar el componente** del modal en `src/app/intranet/admin/asistencias/` (probable `*-manual.component.ts` o similar). Buscar el `httpClient.get('asistencias-admin/personas')`.
2. **Detectar el control del dropdown** (PrimeNG `<p-dropdown [filter]>` o `<p-autoComplete>`). Si es `p-dropdown` con `filter`, migrar a `p-autoComplete` con `completeMethod` o mantener `p-dropdown` con manual filtering server-side.
3. **Implementar debounce** (`rxjs` debounceTime 250-300ms) sobre el evento de filtro/búsqueda del control.
4. **Disparar la request server-side** cada vez que cambia el término de búsqueda. Cancelar la anterior si está en vuelo (`switchMap`).
5. **Manejar el caso "" inicial**: al abrir el modal, hacer 1 request sin search (mantiene comportamiento actual del top-N) para que el dropdown no esté vacío al desplegarse.
6. **Aplicar a los 3 tabs** del modal: Estudiante (`E`), Profesor (`P`), Asistente Admin. (`A`). Probablemente el mismo componente reutilizado con `tipoPersona` distinto.

## Verificación

- Login admin → abrir modal "Registrar asistencia manual" → tab Estudiante.
- Tipear `yauri` → debe dispararse 1 request server-side con `search=yauri` y devolver al estudiante.
- Tipear muy rápido → verificar debounce (no debe haber 1 request por tecla).
- Tab Profesor + Asistente Admin. también con server-side search.
- Estudiantes con asistencia previa del día siguen apareciendo en el listado inicial.
- Sin regresión: el caso vacío "" al abrir el modal sigue mostrando algo (no dropdown vacío).
- Performance: el dropdown responde en <500ms en condiciones normales.

## Contexto

- Reportado 2026-05-19 desde `/intranet/admin/asistencias?tab=gestion`.
- BE brief 203 ya mitigó subiendo caps: `Take(100)` → `Take(500)` por tipo. Eso resuelve sedes <500 estudiantes activos. Este brief es el fix completo para cualquier tamaño de sede.
- DevTools confirmó (2026-05-19): el modal hace 1 sola GET sin `search` al abrirse; búsqueda client-side al tipear.

## Cross-repo

- BE: brief 203 cerrado con cap aumentado en `AsistenciaAdminSeleccionRepository.cs`.
- FE: este brief — switch a server-side search.
- Coordinación: no requiere cambios adicionales en BE (el `search` param ya existe).
