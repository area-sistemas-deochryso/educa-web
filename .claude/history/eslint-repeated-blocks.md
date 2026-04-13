# ESLint `structure/no-repeated-blocks` — Bloques repetidos 3+ veces

> **Estado**: Limpio (informativo)
> **Origen**: Regla `structure/no-repeated-blocks` agregada 2026-04-11
> **Total**: 0 violaciones (verificado post-refactor Fase 2, 2026-04-11)
> **Prioridad**: N/A — vigilancia pasiva

> **Nota**: Verificado tras completar [eslint-max-lines.md](./eslint-max-lines.md). Los helpers extraídos durante esa fase (18 archivos nuevos) eliminaron bastante duplicación estructural, pero ninguno de los patrones match la heurística de esta regla (misma secuencia de 5+ sentencias en el mismo archivo).

---

## Regla

```javascript
'structure/no-repeated-blocks': 'warn'
```

Advierte cuando una secuencia de **5+ sentencias consecutivas** aparece **3+ veces** en el mismo archivo. Heurística text-based después de normalizar espacios.

**Umbrales** (en `eslint.config.js`):
- `MIN_STATEMENTS = 5` — mínimo de sentencias consecutivas para considerar un bloque
- Ocurrencias ≥ 3 en el mismo archivo para disparar

---

## Estado actual

**0 violaciones detectadas** en la base de código actual. Verificado con archivo de prueba que la regla dispara correctamente cuando se introduce duplicación artificial.

Esto significa una de dos cosas:
1. **El código ya extrae helpers cuando hay repetición obvia** — señal de buena higiene
2. **La repetición existe pero no es exacta** — variaciones sutiles (nombres de variables, orden, pequeñas diferencias) evitan el match text-based

---

## Limitaciones conocidas

| Limitación | Impacto |
|---|---|
| Solo detecta duplicación **dentro del mismo archivo** | No captura patrones repetidos entre múltiples facades/services |
| Match **text-based** después de normalizar espacios | Variaciones de naming o comentarios entre bloques evaden la detección |
| Mínimo **5 sentencias consecutivas** | Patrones cortos (3-4 líneas) repetidos no disparan |
| Ventana **deslizante** | Puede reportar múltiples solapamientos del mismo bloque |

---

## Duplicación cross-file — no cubierta por ESLint

Para detectar copy-paste entre archivos se necesita una herramienta separada. Opciones viables:

| Herramienta | Tipo | Integración |
|---|---|---|
| [`jscpd`](https://github.com/kucherenko/jscpd) | CLI dedicado a copy-paste | Standalone, genera reportes HTML/JSON |
| `eslint-plugin-sonarjs` | Plugin ESLint | `sonarjs/no-identical-functions` — misma función identica |

**No instalados**. Si el equipo detecta patrones duplicados entre archivos en code reviews, evaluar agregar `jscpd` al pipeline de CI.

---

## Vigilancia pasiva

Esta task **no requiere acción actualmente**. Se mantiene como referencia para:

1. **Si la regla empieza a disparar** tras nuevos desarrollos → revisar esta lista para identificar patrones emergentes
2. **Si se detectan duplicaciones cross-file** en code review → considerar instalar `jscpd` y crear task específico
3. **Refinar umbrales** si el ruido aparece: ajustar `MIN_STATEMENTS` o el threshold de ocurrencias en `eslint.config.js`

---

## Candidatos conocidos para extracción (no detectados por la heurística)

Aunque la regla no los capture, estos patrones son conocidos por code review previo y viven en múltiples archivos — candidatos para `jscpd` o refactor manual:

- **Patrón CRUD en facades** — `save/update/delete` con estructura similar. Mitigado parcialmente por `BaseCrudFacade`.
- **Patrón de suscripción con WAL** — ya mitigado por `WalFacadeHelper`.
- **Mapping DTO → ViewModel** en components — candidato a adapters en `@data/adapters/`.
- **Validaciones de formulario repetidas** — candidatas a `@shared/validators/`.

Estos patrones deben abordarse en code review y tasks de refactor específicos, no por enforcement automático.
