# Pre-Push Validation

Validar que lint y tests pasen antes de pushear. **BLOQUEA el push si hay errores.**

1. Ejecutar `npm run lint` en el repo frontend
   - Si hay **errors** (no warnings): DETENER y mostrar los errores. NO continuar con push.
   - Warnings son aceptables, no bloquean.
2. Ejecutar `npm test` en el repo frontend
   - Si hay tests fallidos: DETENER y mostrar los fallos. NO continuar con push.
3. Si ambos pasan: reportar "Pre-push OK" y continuar.

**Repo**: `c:\Users\Asus Ryzen 9\EducaWeb\educa-web`
