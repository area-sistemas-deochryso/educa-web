# 777 — FE: el widget «Mi Asistencia» de Inicio nunca muestra la asistencia de hoy (formato de fecha)

> **Repo destino**: `educa-web` (frontend, branch `main`). Abrir el chat nuevo en este repo.
> **Origen**: pasada de verificación local 2026-10-07 (brief 754) · BBDD de prueba, sesión real de estudiante.
> **Validación prod**: ⏳ pendiente desde 2026-10-07 (smoke local con sesión de estudiante; depende del brief 778 BE)
> **Created**: 2026-10-07
> **MODO SUGERIDO**: `/execute` (arreglo pequeño; `/investigate` corto si se quiere confirmar el contrato)
> **exclusive**: `false` · **modules**: `home`, `estudiante`
> **touches**: `src/app/features/intranet/pages/cross-role/home-component/components/estudiante-attendance-widget/estudiante-attendance-widget.component.ts` (+ spec nuevo, hoy no existe).

## Síntoma

En Inicio, el widget «Mi Asistencia» del estudiante dice «Sin datos de asistencia para hoy» aunque exista el registro de hoy.

## Causa (verificada en vivo)

`estadoHoy` hace `detalle.find((d) => d.fecha === hoy)` con `hoy = formatDateISO(new Date())` → `YYYY-MM-DD`.
`GET /api/EstudianteCurso/mi-asistencia` devuelve `detalle[].fecha` como `"2026-08-11T00:00:00"` (DateTime serializado). Nunca son iguales.

Prueba: con la respuesta real interceptada (Biología, 11/08/2026, estado `J`) el widget mostró «Sin datos»; con `fecha: "2026-08-11"` mostró «Biología · JUSTIFICADO» con el chip del curso. Viene del commit `e6aa959e` (no es de 754).

## Qué hacer

1. Comparar solo la parte de fecha (`d.fecha.slice(0, 10) === hoy`, o normalizar con el helper de fechas que ya use el repo; ver cómo lo hace `student-attendance-tab` / `estudiante-curso-hub-asistencia`).
2. Crear el spec del widget (no existe): con `fecha` con hora y sin hora, con y sin registro de hoy, y con `cursoId` nulo (chip neutro).
3. Revisar si hay otros `fecha ===` contra un `YYYY-MM-DD` sobre DTOs de asistencia por curso.

## Criterios de cierre

- [x] Con `fecha: "…T00:00:00"` del BE, el widget muestra el estado de hoy.
- [x] Spec nuevo verde; lint y build verdes.
- [ ] Smoke local con sesión de estudiante y asistencia de hoy (requiere poder guardar asistencia: ver brief 778 del BE; hasta entonces, probar con la respuesta interceptada).
