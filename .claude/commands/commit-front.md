# Commit Frontend

Crear commit en el repo **frontend** (educa-web).

1. Ejecutar `git status` y `git diff --staged` en `educa-web/`
2. Ejecutar `git log --oneline -5` para ver el estilo de commits recientes
3. Analizar los cambios y redactar un mensaje de commit siguiendo Conventional Commits
4. Agregar archivos relevantes (NO usar `git add .` — agregar por nombre)
5. Crear el commit con Co-Authored-By

**Repo**: `c:\Users\Asus Ryzen 9\EducaWeb\educa-web`
**Rama**: `main`

## Idioma del mensaje — inglés obligatorio

A partir de 2026-04-20 todos los mensajes de commit nuevos se redactan en **inglés**.

- Type, scope, descripción corta y cuerpo van en inglés.
- **Excepción única**: nombres propios del dominio en español (módulos, pantallas, entidades, tablas, invariantes) van **entre comillas** y en español tal cual.
- Referencias a planes/chats se mantienen (`Plan 22 Chat 2`, `Chat 7.A`).
- Scopes de Conventional Commits son identificadores técnicos (nombres de carpeta/módulo) y van sin comillas aunque sean en español: `feat(asistencia)`, `fix(home)`, `docs(maestro)`.

**Ejemplos**:

```text
feat(asistencia): Plan 22 Chat 2 — day attendance widgets by role
fix(home): Plan 22 — hex fallback in bars and badges
refactor("Mi asistencia"): unify teacher and student view
feat(asistencia): dispatch to "AsistenciaPersona" with polymorphic discriminator
docs(maestro): close Plan 21 Chat 1.5 — reads + FKs migrated to "AsistenciaPersona"
```

**Anti-patrón**:

```text
❌ feat(home): widgets de asistencia del día por rol
✅ feat(home): day attendance widgets by role

❌ refactor(asistencia): pivote "Mi asistencia" profesor = igual que estudiante
✅ refactor(asistencia): pivot "Mi asistencia" teacher view to match student

❌ docs(maestro): Plan 12 F1 ✅ (A+B+C) — Ola 1 Carril D cerrada
✅ docs(maestro): close Plan 12 F1 (A+B+C) — Wave 1 of Track D done
```
