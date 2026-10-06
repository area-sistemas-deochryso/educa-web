# Testing

Framework: **Vitest** con jsdom

## Comandos

```bash
npm test               # Vitest run
npm run test:watch     # Vitest watch mode
npm run test:coverage  # Con cobertura
```

## Ejemplo de Test

```typescript
describe('MiService', () => {
  let service: MiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ]
    });
    service = TestBed.inject(MiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('should fetch data', () => {
    service.getData().subscribe(data => {
      expect(data).toEqual([]);
    });
    httpMock.expectOne('/api/data').flush([]);
  });
});
```

Un solo archivo o carpeta: `bunx vitest run <ruta>` (local) o `npx vitest run <ruta>`. La config de Vitest (jsdom, `setupFiles`) vive en `vite.config.ts`.

## Convenciones

- Tests en mismo directorio que el archivo fuente con sufijo `.spec.ts`
- Cobertura de paths críticos, no 100%
- Usar mocks para servicios externos

## Trampas conocidas

- **Un mock plano oculta la reactividad.** `{ provide: WalClockService, useValue: { adjustedNow: () => X } }` convierte en constante algo que en producción es un `computed` que se invalida con cada respuesta HTTP. Si el código bajo test lee el reloj dentro de un `computed`/`effect`, usar el `WalClockService` real con `vi.useFakeTimers({ toFake: ['Date'] })` + `vi.setSystemTime(...)` y empujar el skew con `recordServerTime(...)`. Ejemplo: `profesor-curso-hub.floating-slot.spec.ts`.
- **Guards `canDeactivate` con `RouterTestingHarness`**: la navegación queda colgada del aviso; no usar `fixture.whenStable()` hasta responderlo, usar `vi.waitFor` (ver `profesor-curso-hub.component.spec.ts`, describe «salir del hub»).
- **Un test rojo escrito primero es una especificación**, no un fallo: reproducir el hueco antes de arreglarlo evita construir sobre una premisa sin verificar (brief 770).
