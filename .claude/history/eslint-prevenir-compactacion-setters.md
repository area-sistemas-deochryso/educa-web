# ESLint — Prevenir compactación sucia de setters triviales

> **Estado**: Completado (2026-04-13)
> **Origen**: Fase 2 de [history/eslint-unblock-frontend.md](../history/eslint-unblock-frontend.md) — usé compactación visual para pasar `max-lines` en 8+ archivos
> **Relacionado con**: [refactor-honesto-post-max-lines.md](./refactor-honesto-post-max-lines.md)
> **Prioridad**: Alta — sin esta regla, cualquier futuro max-lines se puede "resolver" con el mismo truco sucio

---

## El problema

`max-lines` con `skipBlankLines: true` + `skipComments: true` se puede burlar compactando setters triviales de 3 líneas a 1:

```typescript
// Sucio — cuenta como 1 línea, pasa lint
setUsuarios(usuarios: UsuarioLista[]): void { this._usuarios.set(usuarios); }
setLoading(loading: boolean): void { this._loading.set(loading); }
setError(error: string | null): void { this._error.set(error); }
```

vs

```typescript
// Honesto — cuenta como 3 líneas cada uno
setUsuarios(usuarios: UsuarioLista[]): void {
  this._usuarios.set(usuarios);
}
```

**Ambos compilan, ambos pasan lint.** Pero el primero es un síntoma de que el archivo tiene demasiados setters triviales — debería refactorizarse a `BaseCrudStore`, patrón functional `patchState({key, value})`, o exponer el store directamente.

La compactación de una línea **oculta la deuda** y hace que la regla `max-lines` pierda su valor como señal.

---

## Regla propuesta: `structure/no-compact-trivial-setter`

Detectar métodos de clase que:

1. Tienen cuerpo de **una sola sentencia** en la misma línea que la firma (`{ ... }` en la misma línea)
2. El cuerpo es uno de estos patrones triviales:
   - `this._xxx.set(arg)` — setter de signal privado
   - `this._xxx.update(...)` — updater de signal
   - `this.store.setXxx(arg)` — delegate a store method
   - `this.store.xxxDialog()` — delegate UI
   - Cualquier otra delegación 1:1 a un field/property

Disparar **warning** por cada método que matchea. Si el archivo tiene **5+ en total**, elevar a **error** — señal de que el archivo debería refactorizarse, no compactarse.

### Ejemplo de detección

```typescript
// ❌ Match — body de 1 statement en misma línea + delegación 1:1
setLoading(loading: boolean): void { this._loading.set(loading); }

// ❌ Match — delegate trivial
setSearchTerm(term: string): void { this.store.setSearchTerm(term); }

// ✅ OK — cuerpo multi-línea (es la forma honesta)
setUsuarios(usuarios: UsuarioLista[]): void {
  this._usuarios.set(usuarios);
  this.log.info('Usuarios actualizados');
}

// ✅ OK — la compactación sí reduce complejidad real (expresión, no delegación)
readonly isActive = computed(() => this._users().some(u => u.activo));

// ✅ OK — one-liner legítimo (lógica, no delegación)
toggleExpanded(): void { this._expanded.update(v => !v); }
```

### Heurística de "delegación trivial"

Un método es delegación trivial si su cuerpo es una única llamada tal que:

- `this.<field>.<method>(<args>)` donde los `<args>` son exactamente los parámetros del método en el mismo orden
- O `this.<field>.set(<param>)` donde `<param>` es el parámetro del método

No cuenta como trivial:

- Llamadas con transformación (`this._x.set(arg * 2)`)
- Llamadas que disparan side effects secundarios (`this.store.setX(x); this.log.info(...)`) — pero eso ya no es one-liner
- Expresiones calculadas (`toggleX(): void { this._x.update(v => !v); }`)

---

## Umbrales propuestos

| Cantidad en un archivo | Nivel |
|---|---|
| 1-4 | `warn` con mensaje explicativo |
| 5+ | `error` — "el archivo tiene N setters triviales compactados. Considerar refactor a BaseCrudStore o exponer store directamente" |

El umbral de 5 es porque aislado no es pecado (a veces un setter trivial es legítimo), pero 5+ en el mismo archivo es un patrón que indica que el store/facade debería reestructurarse.

---

## Casos especiales a permitir

- **Barrel `index.ts` con re-exports**: no son clases, no aplica
- **Base classes** (`BaseCrudFacade`, `BaseCrudStore`): se les permite tener delegates — son la abstracción correcta
- **Archivos con `/* eslint-disable structure/no-compact-trivial-setter -- Razón: ... */`** con justificación específica (no `<task pendiente>`)

---

## Implementación

Crear un custom rule en `eslint.config.js` similar a `structure/no-deep-relative-imports` y `structure/no-repeated-blocks` ya existentes.

**Pseudocódigo**:

```javascript
{
  meta: { type: 'suggestion', messages: { ... } },
  create(context) {
    const matches = [];
    return {
      MethodDefinition(node) {
        if (!isOneLineBody(node)) return;
        if (!isTrivialDelegation(node)) return;
        matches.push(node);
      },
      'Program:exit'() {
        const threshold = 5;
        if (matches.length >= threshold) {
          // Reportar error en el primero con mensaje sobre el total
          context.report({ node: matches[0], messageId: 'tooManyTrivial', data: { count: matches.length } });
        } else {
          matches.forEach(n => context.report({ node: n, messageId: 'trivialCompacted' }));
        }
      },
    };
  },
}
```

### Helpers necesarios

- `isOneLineBody(node)` — verifica que `node.value.body.body` tenga 1 statement y que el statement esté en la misma línea que la declaración del método (usando loc)
- `isTrivialDelegation(node)` — verifica que el único statement sea:
  - `ExpressionStatement` con `CallExpression`
  - La callee sea `MemberExpression` tipo `this.X.Y`
  - Los argumentos coincidan en orden con los parámetros del método

---

## Validación post-implementación

Al activar la regla, estos archivos (los mismos que refactoricé con compactación sucia) deben disparar error:

- `usuarios.store.ts`
- `horarios.store.ts`
- `campus-admin.store.ts`
- `curso-contenido.store.ts`
- `permisos-usuarios.facade.ts`
- `calificaciones.facade.ts`
- `campus-admin.facade.ts`
- `salones-admin.facade.ts`
- `usuarios.component.ts` (los `onXxxChange` compactados)

Eso valida que la regla detecta el patrón real. Luego, el task [refactor-honesto-post-max-lines.md](./refactor-honesto-post-max-lines.md) migra esos archivos a `BaseCrudStore` o multi-facade — y después el lint queda limpio por **razones estructurales**, no por compactación.

---

## Criterios de éxito

- [ ] Regla `structure/no-compact-trivial-setter` implementada en `eslint.config.js`
- [ ] Dispara error en los 9 archivos listados arriba (antes del refactor del task hermano)
- [ ] No dispara falsos positivos en one-liners legítimos (`toggleExpanded`, getters con computed, etc.)
- [ ] Mensaje de error es educativo — menciona las 3 alternativas (BaseCrudStore, exponer store, patchState pattern)
- [ ] Documentada en [rules/eslint.md](../rules/eslint.md) con ejemplos de qué es sucio y qué es honesto

---

## Dependencia de orden

Este task tiene dos ejecuciones posibles:

1. **Activar regla primero** → archivos listados quedan rojos → obliga a refactorizar (task hermano)
2. **Refactorizar primero** (task hermano) → luego activar regla para que no regrese la deuda

Opción 1 es más disciplinada pero rompe el build temporalmente. Opción 2 es más segura pero requiere voluntad de seguir con el refactor. **Recomiendo opción 1** porque sin dolor el refactor se posterga indefinidamente.

---

## Referencias

- [history/eslint-unblock-frontend.md](../history/eslint-unblock-frontend.md) — contexto de la deuda generada
- [refactor-honesto-post-max-lines.md](./refactor-honesto-post-max-lines.md) — task hermano con los archivos a limpiar
- [rules/eslint.md](../rules/eslint.md) — donde documentar la regla nueva
- [rules/crud-patterns.md](../rules/crud-patterns.md) — patrón BaseCrudStore / multi-facade que la regla empuja a adoptar
- `eslint.config.js` — ubicación de las reglas custom existentes (`structure/*`)
