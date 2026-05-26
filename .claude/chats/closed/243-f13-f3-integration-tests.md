# Brief 243 — F13 F3: Flujos de Integración UI

<!-- minimal-from-go -->

> **Plan**: F13 (Frontend Test Gaps) · **Fase**: F3
> **Modo sugerido**: /execute
> **Fecha**: 2026-05-26

## Objetivo

Integration tests para 4 cadenas críticas del FE:
1. Login flow
2. Guard + permisos
3. CRUD admin pattern
4. Error recovery

## Criterio de éxito

- 4 spec files (uno por cadena) con TestBed + real providers donde sea posible
- Validan el flujo end-to-end dentro del FE (no E2E browser)
- Suite completa pasa green

## Fuente

Cola maestro pos 7 — F13 F3. Plan: `.claude/plan/test-frontend-gaps.md`.
