# Logging Feature (Frontend)

Centralizes console logging and debug configuration for the app.
This README should live at the same level as the logging feature files.

## Files
- `logging.store.ts`: Signal-based store that holds the current configuration.
- `logging.facade.ts`: Orchestrates logger + DebugService and keeps the store in sync.
- `../logs/logger.ts`: Low-level logger with tag and level filters.
- `../debug/debug.service.ts`: Tagged debug helper with RxJS/signal helpers.

## Usage
Inject the facade and bind to its view model:

```ts
import { LoggingFacade } from '@core/helpers';
import { inject } from '@angular/core';

private readonly logging = inject(LoggingFacade);
readonly vm = this.logging.vm;
```

Update config from UI or dev tools:

```ts
this.logging.setLogFilter('Auth*,UI:*,-UI:Noisy*');
this.logging.setLogMinLevel('warn');

this.logging.setDebugFilter('STORE:*');
this.logging.setDebugMinLevel('TRACE');
```

Clear overrides:

```ts
this.logging.clearOverrides();
```

## Storage Keys
- `LOG` / `LOG_LEVEL` for logger
- `DEBUG` / `DEBUG_LEVEL` for DebugService

## Notes
- Logs are only printed in development (never in production).
- Filters are applied by tag. Use `*` as wildcard and `-` to exclude.
