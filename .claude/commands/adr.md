---
description: Modo ADR — crear un Architecture Decision Record en decisions/ con formato estándar.
---

# Modo: ADR (Architecture Decision Record)

**Objetivo**: dejar escrita una decisión arquitectónica **antes** de ejecutarla, especialmente si rompe una regla dura o compromete al proyecto a largo plazo.

## Cuándo se DEBE abrir un ADR

- Se rompe una regla de `.claude/rules/` del proyecto.
- Se adopta/descarta una tecnología nueva (lib, framework, protocolo).
- Se compromete un patrón que se va a replicar en varios sitios.
- Cambia una decisión previa (superseding).

## Cuándo NO hace falta

- Fix localizado sin impacto cross-sistema.
- Refactor que respeta reglas existentes.
- Elección entre dos implementaciones equivalentes dentro del mismo subsistema.

## Numeración y nombre

- Formato: `NNNN-<scope-kebab>.md` en `.claude/decisions/`. **4 dígitos**, padded.
- El siguiente número = `max(existentes) + 1`. Confirmar con:
  ```bash
  ls .claude/decisions/ 2>/dev/null | grep -E '^[0-9]{4}-' | sort | tail -3
  ```
  Si la carpeta no existe, crearla. Primer ADR = `0001-...`.
- Scope corto, kebab-case, ≤ 5 palabras. Ej: `0010-webrtc-for-multiplayer.md`.

## Plantilla obligatoria

```markdown
# NNNN — <Título corto>

- **Status**: proposed | accepted | superseded by NNNN | rejected
- **Fecha**: YYYY-MM-DD

## Contexto

Por qué se necesita esta decisión. Qué problema resuelve. Qué restricciones aplican (reglas del proyecto, stack, limitaciones técnicas).

## Decisión

Qué se decide. Concreto, sin ambigüedad. Incluir diagramas ASCII si aclaran flujos.

## Alternativas consideradas

- **Alt A** — descripción · por qué no.
- **Alt B** — descripción · por qué no.

## Consecuencias

**Gana**:
- ...

**Pierde**:
- ...

## Reglas derivadas (si aplica)

Si esta decisión agrega/modifica reglas vinculantes, linkear a `../rules/` y crear/actualizar el archivo de regla.

## Ver también

- Decisiones relacionadas: [NNNN-...](NNNN-...md)
- Sistemas afectados: [../systems/...](../systems/...)
```

## Reglas

- **Status inicial** suele ser `proposed`. Sólo pasa a `accepted` con visto bueno del usuario.
- **No sobrescribir ADRs aceptados** — si se revisa, crear uno nuevo con `supersedes NNNN` y actualizar el viejo a `superseded by NNNN`.
- Si la decisión introduce una regla, crear también el archivo correspondiente en `rules/` con formato similar al resto.
- **Corto y accionable** — un ADR bueno se lee en < 3 min.

## Al terminar

- Mostrar path creado.
- Si hay regla derivada: también crear/actualizar archivo en `rules/`.
- Recordar al usuario linkear desde `CLAUDE.md` o `decisions/README.md` si aplica.
