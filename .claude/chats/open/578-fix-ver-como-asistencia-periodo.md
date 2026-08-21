> **Repo destino**: `educa-web` (frontend, branch `main`) — confirmar en investigación si toca también `Educa.API`.
> **Plan**: 104 (coord) · **Fase**: F1 · **Creado**: 2026-08-21 · **Estado**: ⏳ abierto.

---

# 578 — Fix: "ver como" en Asistencia no respeta el contexto ni discrimina por periodo

## Contexto

Mismo antipatrón que [P97](../../../../educa-coord/plans/xrepo-97-verificacion-identidad-ver-como.md) — código que no considera el contexto "ver como" activo (P92). `INV-VIEWAS01` (`.claude/rules/business-rules.md`) documenta el checklist aplicable; validar contra él al confirmar causa raíz. Reportado por el usuario 2026-08-20 durante uso real.

## Hallazgos a corregir

1. En `/intranet/asistencia`, el modo "ver como" no se respeta correctamente: el admin no debería ver la página como si fuera el rol impersonado — debe cargar en modo admin.
2. El modo "ver como" no discrimina por periodo (verano / regular) como sí hacen el resto de páginas.

## Qué investigar

- Punto 1: comparar `/intranet/asistencia` contra el patrón ya correcto en Horario/Notas (`ResolveViewAsIdentity()` server-side, o el filtro FE equivalente) para ver dónde se pierde el contexto.
- Punto 2: identificar cómo las demás páginas resuelven el periodo activo (verano/regular) y por qué Asistencia bajo "ver como" no aplica el mismo filtro.

## Done-when

- `/intranet/asistencia` bajo "ver como" carga en modo admin (no como el rol impersonado), verificado en vivo.
- El filtro de periodo (verano/regular) se aplica en modo "ver como" igual que en el resto de páginas, verificado en vivo con datos de ambos periodos.

## Plan cross-repo

[`educa-coord/plans/xrepo-104-ver-como-asistencia-periodo.md`](../../../../educa-coord/plans/xrepo-104-ver-como-asistencia-periodo.md)
