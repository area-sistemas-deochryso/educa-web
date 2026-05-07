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

## HTTP one-shots en services `providedIn: 'root'`

Los services singleton (`@Injectable({ providedIn: 'root' })`) y facades root no tienen `DestroyRef` natural. Para HTTP one-shots (observables que completan al recibir respuesta) **no usar `subscribe()` desnudo** — convertir a Promise con `firstValueFrom` y manejar el éxito/error explícitamente.

```typescript
// ✅ Fire-and-forget — error silenciado intencional
firstValueFrom(this.api.warmup()).catch(() => {
  // Best-effort: si falla, la siguiente request paga el cold start.
});

// ✅ Con manejo de éxito y error
firstValueFrom(this.api.getActivas())
  .then((response) => this.applyNotifications(response))
  .catch(() => this.applyNotifications([]));

// ✅ En método async existente
private async executeServerConfirmed(config: WalMutationConfig): Promise<void> {
  try {
    const result = await firstValueFrom(config.http$());
    config.onCommit(result);
  } catch (err) {
    config.onError(err);
  }
}

// ❌ subscribe() desnudo en service root — viola la regla 2
this.api.warmup().subscribe();
this.api.getActivas().subscribe({ next, error });
```

**Por qué**: el `subscribe` desnudo en service root no es leak (HTTP completa solo), pero rompe la regla universal "siempre `takeUntilDestroyed`" sin necesidad de excepción. `firstValueFrom` deja el código alineado con `async/await` y obliga al dev a decidir explícitamente qué hacer en error (fire-and-forget se vuelve `.catch(() => {})` con comentario, no callback olvidado).

**Cuándo NO aplicar**: streams continuos (`Subject`, `BehaviorSubject`, observables que emiten múltiples veces). Esos siguen requiriendo `takeUntilDestroyed` cuando hay scope que muere.
