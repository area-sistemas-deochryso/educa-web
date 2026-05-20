# comments (override de educa-web)

> Filosofía universal: ver `~/.claude/rules/comments.md`. Acá viven el formato `#region` y las reglas por tipo de archivo del stack Angular + NgRx Signals.

## Formato preferido

**`// #region` / `// #endregion`** en lugar de separadores tipo `// ============`. Ver `@.claude/rules/regions.md` para la convención completa.

## Reglas por tipo de archivo

| Tipo | ✅ SÍ | ❌ NO |
|---|---|---|
| **Stores / Services** | Separadores de sección, `/** */` en mutaciones quirúrgicas, validaciones de negocio | Cada getter/setter, código obvio de signals |
| **Components** | Separar secciones (Signals, Estado local, Computed, Lifecycle, Handlers), `computed` complejos | Cada event handler simple, cada property |
| **Facades** | Estrategia de cada operación CRUD (refetch vs mutación quirúrgica), helpers no obvios | Métodos que sólo delegan |
| **Templates HTML** | Secciones visuales grandes (Header, Stats, Filtros, Tabla, Dialogs), grupos de filtros/botones | Cada binding simple, estructura obvia de PrimeNG |
| **SCSS** | Secciones por componente visual, overrides de `::ng-deep`, hacks necesarios | Cada propiedad CSS, layouts obvios |

## Ejemplo: ✅ correcto

```typescript
export class UsersStore {
  // #region Estado privado
  private readonly _users = signal<User[]>([]);
  private readonly _loading = signal(false);
  // #endregion

  // #region Lecturas públicas
  readonly users = this._users.asReadonly();
  readonly loading = this._loading.asReadonly();
  // #endregion

  // #region Validaciones
  readonly emailError = computed(() => {
    const email = this._formData().email || '';
    // Requerido para todos los roles excepto Estudiante
    if (!email && this.role() !== 'Estudiante') return 'Email es obligatorio';
    if (!email) return null;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) ? null : 'Formato inválido';
  });
  // #endregion

  // #region Comandos de mutación
  /**
   * Mutación quirúrgica: actualiza solo el usuario especificado
   * sin refetch completo para mejor performance
   */
  updateUser(id: number, updates: Partial<User>): void {
    this._users.update((users) =>
      users.map((u) => (u.id === id ? { ...u, ...updates } : u))
    );
  }
  // #endregion
}
```

## Ejemplo: ❌ incorrecto

```typescript
export class UsersStore {
  // Signal privado de usuarios          ← Redundante
  private readonly _users = signal<User[]>([]);
  // Getter público de usuarios          ← Redundante
  readonly users = this._users.asReadonly();
  // Método para actualizar usuario      ← Redundante
  updateUser(id: number, updates: Partial<User>): void {
    // Actualiza el signal de usuarios   ← Redundante
    this._users.update((users) =>
      // Mapea el array                  ← Redundante
      users.map((u) => (u.id === id ? { ...u, ...updates } : u))
    );
  }
}
```

## Ver también

- `@.claude/rules/regions.md` — convención `#region` completa.
- `~/.claude/rules/comments.md` — filosofía universal.
