# Pre-Push Validation

Validar que lint y tests pasen antes de pushear. **BLOQUEA el push si hay errores.**

## Pasos

1. Ejecutar `npm run lint` y `npm test` en paralelo
2. Evaluar resultados:
   - **Lint warnings** (sin errors): OK, no bloquean
   - **Lint errors** o **tests fallidos**: BLOQUEAR — ir a paso 3
   - **Ambos pasan**: reportar "Pre-push OK" y terminar
3. **Si hay fallos**: mostrar los errores al usuario y arreglarlos
4. **Commitear el fix** como commit separado (NO amend) con mensaje descriptivo
5. **Re-ejecutar lint y tests** desde el paso 1
6. Repetir hasta que ambos pasen — solo entonces reportar "Pre-push OK"

## Reglas

- NUNCA reportar "Pre-push OK" si lint tiene errors o tests fallan
- NUNCA pushear sin "Pre-push OK" confirmado
- Cada fix va en su propio commit, no mezclado con el commit original
- Si un fix no es trivial (> 5 min estimado), DETENER y consultar al usuario

**Repo**: `c:\Users\Asus Ryzen 9\EducaWeb\educa-web`
