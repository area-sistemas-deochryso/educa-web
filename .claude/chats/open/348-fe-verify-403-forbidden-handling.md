# 348 — Verify frontend handles new 403 Forbidden responses

> **Created**: 2026-06-25
> **Origen**: Educa.API chat 347 · commit 36287019 · 2026-06-25
> **Repo**: educa-web
> **Mode**: `/investigate`

## Contexto del cambio

Educa.API ahora retorna **403 Forbidden** (en vez de 401) para casos de ACCESS_DENIED donde el usuario está autenticado pero no tiene permiso al recurso. Afecta ~31 endpoints en services de:

- Contenido (tareas, archivos, semanas, grupos, cursos)
- Calificaciones (validación, periodos)
- Asistencias (horarios de curso, permisos de salud)
- Comunicación (conversaciones)
- Profesor (acceso a salones/estudiantes)

## Impacto en este repo

El interceptor HTTP del frontend probablemente trata 401 y 403 de forma distinta:
- **401** → redirect a login (token expirado)
- **403** → ¿qué hace? ¿muestra error? ¿redirect?

## Objetivo

1. Verificar cómo el interceptor HTTP maneja 403 vs 401
2. Confirmar que los flujos afectados muestran un mensaje adecuado al usuario
3. Si no hay manejo de 403 → implementar uno (toast/snackbar "No tienes permiso")

## MODO SUGERIDO

`/investigate` — primero entender qué hace el interceptor actual con 403.
