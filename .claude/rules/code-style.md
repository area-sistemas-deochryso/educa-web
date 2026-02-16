# Convenciones de Código

## Imports - SIEMPRE usar alias de paths

```typescript
// ✅ CORRECTO
import { AuthService, StorageService } from '@core/services';
import { logger } from '@core/helpers';
import { BaseRepository } from '@data/repositories';
import { environment } from '@config';

// ❌ INCORRECTO
import { AuthService } from '../../core/services/auth';
```

### Alias disponibles (tsconfig.json)

- `@app/*` → `src/app/*`
- `@core` / `@core/*` → `src/app/core`
- `@shared` / `@shared/*` → `src/app/shared`
- `@features/*` → `src/app/features/*`
- `@config` → `src/app/config`
- `@data/*` → `src/app/data/*`

## Componentes - Siempre standalone

```typescript
@Component({
  selector: 'app-mi-componente',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule],
  templateUrl: './mi-componente.component.html',
  styleUrl: './mi-componente.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,  // OnPush por defecto
})
export class MiComponenteComponent { }
```

### Reglas de ChangeDetection

- **Presentational (Dumb)**: SIEMPRE `OnPush`
- **Container/Smart, Page/Route**: `OnPush` preferible
- **Layout/Shell**: `Default` aceptable
- **Wrapper/Integration**: `Default` (NO forzar OnPush)
- **Ephemeral/Flow**: `OnPush` preferible

> Ver `@.claude/rules/architecture.md` para taxonomía completa de componentes

## Servicios - inject() y providedIn root

```typescript
@Injectable({ providedIn: 'root' })
export class MiService {
  private http = inject(HttpClient);
  private destroyRef = inject(DestroyRef);

  private readonly _loading = signal(false);
  readonly loading = this._loading.asReadonly();
}
```

## Logging - SIEMPRE usar logger, NUNCA console.log

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
|------|------------|---------|
| Archivos | kebab-case | `user-permisos.service.ts` |
| Clases | PascalCase | `UserPermisosService` |
| Variables | camelCase | `isAuthenticated` |
| Constantes | UPPER_SNAKE_CASE | `MAX_LOGIN_ATTEMPTS` |
| Observables | camelCase$ | `isAuthenticated$` |
| Signals privados | _camelCase | `_loading` |
| Interfaces | PascalCase | `UsuarioDetalle` |

## Buenas Prácticas OBLIGATORIAS

1. **Siempre usar logger** en lugar de console.log/error/warn
2. **Siempre usar takeUntilDestroyed** para subscripciones
3. **Siempre importar desde alias** (@core, @shared, etc.)
4. **Componentes standalone con OnPush** - no usar NgModules
5. **inject() sobre constructores** para inyección de dependencias
6. **Signals para estado local**, NgRx Signals para estado global
7. **Barrel exports** (index.ts) para agrupar exports
8. **Strict mode** habilitado - tipar todo correctamente
