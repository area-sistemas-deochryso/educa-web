# Commit Backend

Crear commit en el repo **backend** (Educa.API).

1. Ejecutar `git status` y `git diff --staged` en `Educa.API/Educa.API/`
2. Ejecutar `git log --oneline -5` para ver el estilo de commits recientes
3. Analizar los cambios y redactar un mensaje de commit siguiendo Conventional Commits
4. Agregar archivos relevantes (NO usar `git add .` — agregar por nombre)
5. Crear el commit con Co-Authored-By

**Repo**: `c:\Users\Asus Ryzen 9\EducaWeb\Educa.API\Educa.API` (raíz del repo git)
**Rama**: `master`

## Idioma del mensaje — inglés obligatorio

A partir de 2026-04-20 todos los mensajes de commit nuevos se redactan en **inglés**.

- Type, scope, descripción corta y cuerpo van en inglés.
- **Excepción única**: nombres propios del dominio en español (módulos, pantallas, entidades, tablas, invariantes) van **entre comillas** y en español tal cual.
- Referencias a planes/chats se mantienen (`Plan 22 Chat 2`, `Chat 7.A`).
- Scopes de Conventional Commits son identificadores técnicos y van sin comillas aunque sean en español: `feat(asistencia)`, `fix(auth)`, `docs(maestro)`.

**Ejemplos**:

```text
feat(asistencia): Plan 21 Chat 7.A — admin day-teachers endpoint
feat(security): read Firebase credential from env var, return JaaS appId in token response
feat(asistencia): polymorphic Teacher/Student dispatch + "AsistenciaPersona" table
test(controllers): Plan 12 F1.B — "AsistenciaController" tests (5 tests)
```

**Anti-patrón**:

```text
❌ feat(asistencia): Plan 21 Chat 7.A — endpoint dia-profesores admin
✅ feat(asistencia): Plan 21 Chat 7.A — admin day-teachers endpoint

❌ feat(asistencia): dispatch polimórfico Profesor/Estudiante + tabla AsistenciaPersona
✅ feat(asistencia): polymorphic Teacher/Student dispatch + "AsistenciaPersona" table
```
