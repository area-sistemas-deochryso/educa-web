# Push Frontend

Push del repo **frontend** a origin. **El push solo ocurre si pre-push pasa.**

## Flujo completo

1. **OBLIGATORIO**: Ejecutar `/pre-push`
   - Si falla: arreglar, commitear fix, re-ejecutar `/pre-push`
   - Repetir hasta que pase — NO saltar este paso
   - Solo continuar cuando reporte "Pre-push OK"
2. Verificar commits pendientes: `git log origin/main..HEAD --oneline`
3. Ejecutar `git push origin main`
4. Confirmar push exitoso mostrando los commits pusheados

## Reglas

- NUNCA ejecutar `git push` sin "Pre-push OK" confirmado en este mismo flujo
- Si `/pre-push` generó commits de fix, esos commits se incluyen en el push

**Repo**: `c:\Users\Asus Ryzen 9\EducaWeb\educa-web`
**Remote**: `origin/main`
