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

## Convenciones

- Tests en mismo directorio que el archivo fuente con sufijo `.spec.ts`
- Cobertura de paths críticos, no 100%
- Usar mocks para servicios externos
