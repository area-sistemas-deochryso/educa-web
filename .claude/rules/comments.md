# Comentarios en Código

## Principio fundamental

> **"Comentarios mínimos pero útiles que permitan ubicar fácilmente qué se hace."**

- ✅ Facilitar la navegación rápida del código
- ✅ Explicar el "por qué", no el "qué"
- ✅ Marcar secciones lógicas
- ❌ NO describir lo obvio ni ser redundantes

---

## Cuándo comentar

### ✅ SÍ comentar

| Situación | Ejemplo |
|-----------|---------|
| **Secciones lógicas** | Agrupar bloques relacionados |
| **Decisiones no obvias** | Por qué se eligió un approach específico |
| **Workarounds** | Soluciones temporales o hacks necesarios |
| **Validaciones complejas** | Reglas de negocio no evidentes |
| **APIs públicas** | Servicios, métodos públicos, interfaces |

### ❌ NO comentar

| Situación | Por qué |
|-----------|---------|
| Código auto-explicativo | `// Incrementar contador` antes de `count++` |
| Nombres descriptivos | Si la variable/función explica su propósito |
| Código temporal | Comentar código en lugar de eliminarlo |
| Obviedades | `// Constructor` antes del constructor |

---

## Reglas por tipo de archivo

| Tipo | ✅ SÍ | ❌ NO |
|------|-------|------|
| **Stores/Services** | Separadores de sección, documentar mutaciones quirúrgicas con `/** */`, validaciones de negocio | Cada getter/setter, código obvio de signals |
| **Components** | Separar secciones (Signals, Estado local, Computed, Lifecycle, Handlers), computed complejos | Cada event handler simple, cada property |
| **Facades** | Estrategia de cada operación CRUD (refetch vs mutación), helpers no obvios | Métodos que solo delegan |
| **Templates HTML** | Secciones visuales grandes (Header, Stats, Filtros, Tabla, Dialogs), grupos de filtros/botones | Cada binding simple, estructura obvia de PrimeNG |
| **SCSS** | Secciones por componente visual, overrides de `::ng-deep`, hacks necesarios | Cada propiedad CSS, layouts obvios |

---

## Formato de comentarios

**PREFERIR `// #region`** en lugar de `// ============`. Ver `@.claude/rules/regions.md`.

| Tipo | Cuándo usar |
|------|-------------|
| `// #region` | Separadores de sección colapsables (preferido) |
| `// Comentario` | Explicar "por qué" inline |
| `/** JSDoc */` | Documentar APIs públicas y mutaciones quirúrgicas |
| ❌ Nada | Código auto-explicativo |

---

## Ejemplo: ✅ CORRECTO

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

## Ejemplo: ❌ INCORRECTO

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

---

## Checklist de revisión

```
[ ] ¿Hay separadores de sección donde ayudan a navegar?
[ ] ¿Los comentarios explican "por qué" en lugar de "qué"?
[ ] ¿Las decisiones no obvias están documentadas?
[ ] ¿Las APIs públicas tienen JSDoc?
[ ] ¿Se evitaron comentarios redundantes y obviedades?
[ ] ¿El código puede entenderse sin los comentarios?
```

**Frase clave**: *"Comentar lo justo para navegar rápido y entender decisiones no obvias."*
