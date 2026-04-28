# code-style (educa-web — Angular + NgRx Signals + PrimeNG)

> Principios universales (TS strict, no `any`, alias > relativos, SRP, ~300 líneas): ver `~/.claude/rules/coding.md`. Idioma: ver `~/.claude/rules/code-language.md`. Comentarios: ver `~/.claude/rules/comments.md`.

Acá viven sólo las convenciones específicas del stack Angular + NgRx + PrimeNG de este proyecto.

## Aliases de imports (tsconfig.json)

| Alias | Apunta a |
|---|---|
| `@app/*` | `src/app/*` |
| `@core` / `@core/*` | `src/app/core` |
| `@shared` / `@shared/*` | `src/app/shared` |
| `@features/*` | `src/app/features/*` |
| `@config` / `@config/*` | `src/app/config` |
| `@env` / `@env/*` | `src/app/config` |
| `@data` / `@data/*` | `src/app/data` |
| `@test` | `src/test-setup` |

```typescript
// ✅
import { AuthService, StorageService } from '@core/services';
import { logger } from '@core/helpers';
import { BaseRepository } from '@data/repositories';
import { environment } from '@config';

// ❌
import { AuthService } from '../../core/services/auth';
```

## Componentes — siempre standalone

```typescript
@Component({
  selector: 'app-mi-componente',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule],
  templateUrl: './mi-componente.component.html',
  styleUrl: './mi-componente.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MiComponenteComponent { }
```

### ChangeDetection por taxonomía

- **Presentational (Dumb)**: SIEMPRE `OnPush`.
- **Container/Smart, Page/Route**: `OnPush` preferible.
- **Layout/Shell**: `Default` aceptable.
- **Wrapper/Integration**: `Default` (no forzar `OnPush`).
- **Ephemeral/Flow**: `OnPush` preferible.

> Ver `@.claude/rules/architecture.md` para taxonomía completa de componentes.

## Servicios — `inject()` y `providedIn: 'root'`

```typescript
@Injectable({ providedIn: 'root' })
export class MiService {
  private http = inject(HttpClient);
  private destroyRef = inject(DestroyRef);

  private readonly _loading = signal(false);
  readonly loading = this._loading.asReadonly();
}
```

## Logging — `logger`, nunca `console.*`

```typescript
import { logger } from '@core/helpers';

logger.log('mensaje');
logger.warn('advertencia');
logger.error('error crítico');  // SÍ aparece en producción
logger.debug('debug info');
logger.tagged('MiService', 'log', 'mensaje con prefijo');
```

## Naming

| Tipo | Convención | Ejemplo |
|---|---|---|
| Archivos | kebab-case | `user-permisos.service.ts` |
| Clases | PascalCase | `UserPermisosService` |
| Variables | camelCase | `isAuthenticated` |
| Constantes | UPPER_SNAKE_CASE | `MAX_LOGIN_ATTEMPTS` |
| Observables | camelCase$ | `isAuthenticated$` |
| Signals privados | _camelCase | `_loading` |
| Interfaces | PascalCase | `UsuarioDetalle` |

## Buenas prácticas obligatorias

1. Siempre `logger`, nunca `console.*`.
2. Siempre `takeUntilDestroyed` para subscripciones RxJS.
3. Siempre importar desde alias.
4. Componentes standalone con `OnPush`. No `NgModule`.
5. `inject()` sobre constructores.
6. Signals para estado local, NgRx Signals para estado global.
7. Barrel exports (`index.ts`) para agrupar exports.
8. No `Subject`/`BehaviorSubject` en stores — usar `signal` + método de trigger.
