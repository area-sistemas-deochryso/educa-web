# Comando: Verify (confirmar validación post-deploy)

**Objetivo**: cerrar el ciclo de un chat que estaba esperando validación post-deploy. Mueve el brief de `chats/awaiting-prod/` → `chats/closed/` cuando la verificación pasó, o lo regresa a `running/` cuando hubo rollback.

**Principio**: `/end` y `/verify` son **dos cierres distintos**. `/end` cierra el trabajo local (commit + validación local). `/verify` cierra la **realidad de producción** (smoke test browser, query SQL, validación del jefe, telemetría observada).

> Sin este comando, el bucket `awaiting-prod/` crece sin límite y la única señal de que algo se verificó vive en la cabeza del usuario. `/verify` lo deja en el archivo y en git history.

## Cuándo se invoca

| Situación | Acción |
| --- | --- |
| Hiciste el smoke test browser y todo OK | `/verify <NNN>` |
| El jefe validó el feature deployado | `/verify <NNN>` |
| Corriste el SELECT en prod y los datos llegaron como se esperaba | `/verify <NNN>` |
| 48-72h de telemetría confirmaron el threshold sin disparar 429 | `/verify <NNN>` |
| El deploy falló o la verificación detectó un bug | `/verify <NNN> rollback "razón corta"` |

## Sintaxis

```bash
/verify <NNN>                          # Verificación exitosa (default)
/verify <NNN> rollback "razón corta"   # Verificación falló, retomar trabajo
/verify <NNN> "nota corta"             # Verificación exitosa con nota (opcional)
```

`<NNN>` es el número del brief (ej: `045` para `045-plan-32-chat-4-fe-correlation-hub-pill-wiring.md`).

## Casos

### Caso 1: Verificación exitosa (default)

`/verify 045`

1. **Anotar el brief**: agregar línea `> **Validación prod**: ✅ verificada YYYY-MM-DD` debajo del header del brief (o `✅ verificada YYYY-MM-DD — <nota corta>` si se pasó nota).
2. `git mv .claude/chats/awaiting-prod/<NNN>-...md .claude/chats/closed/<NNN>-...md`.
3. **Update maestro si aplica**: si el plan asociado tiene mención "pendiente verificación post-deploy" en sus notas operativas, actualizarla a "✅ verificado YYYY-MM-DD". No tocar las narrativas históricas en `Foco (actualizado ...)`.
4. **Commit**: invocar `/commit-front` con scope `chore(verify)` o equivalente. Mensaje sugerido:
   ```
   chore(verify): mark <NNN> as production-verified
   ```
5. Reportar:
   ```markdown
   ## ✅ VERIFY · <NNN>

   | Campo | Valor |
   | --- | --- |
   | Brief | awaiting-prod/<NNN>-...md → **closed/** |
   | Anotación | ✅ verificada YYYY-MM-DD |
   | Commit | `<hash>` |
   ```

### Caso 2: Rollback (verificación falló)

`/verify 045 rollback "el smoke test detectó NPE en el hub al cargar correlationId vacío"`

1. **Anotar el brief**: agregar líneas debajo del header:
   ```markdown
   > **Validación prod**: ❌ rollback YYYY-MM-DD
   > **Motivo del rollback**: <razón pasada al comando>
   > **Estado**: 🟡 retomado para fix.
   ```
2. `git mv .claude/chats/awaiting-prod/<NNN>-...md .claude/chats/running/<NNN>-...md`.
3. **Verificar gate de `running/`**: si ya hay otro brief en `running/`, **frenar** y avisar al usuario que primero debe `/block-chat` el actual o terminar su sesión. El rollback es prioritario pero no destructivo del WIP en curso.
4. **NO commitear automáticamente** — el rollback abre trabajo nuevo. El usuario decide si arrancar `/go` ya o esperar.
5. Reportar:
   ```markdown
   ## ❌ ROLLBACK · <NNN>

   | Campo | Valor |
   | --- | --- |
   | Brief | awaiting-prod/<NNN>-...md → **running/** |
   | Motivo | <razón> |
   | Próximo paso | `/go` para arrancar el fix, o `/block-chat` si necesitás pausar otro |
   ```

### Caso 3: NNN no existe en `awaiting-prod/`

Reportar y abortar:

> `<NNN>` no está en `awaiting-prod/`. Listado actual:
> - `<NNN1>-...md`
> - `<NNN2>-...md`
> - ...

## Argumentos opcionales

- `/verify list` — solo lista los briefs en `awaiting-prod/` con días desde su llegada al bucket. No mueve nada.
- `/verify all` — interactivo: itera por cada brief, pregunta verificado/rollback/skip por uno.

## Qué NO hago

- **No verifico yo** el deploy — la verificación es del usuario (smoke test, jefe, telemetría). `/verify` solo registra que la verificación pasó.
- **No pusheo a remoto** — el commit local queda como cualquier otro `/end`.
- **No genero brief nuevo** si hay rollback — el mismo brief vuelve a `running/` con el motivo agregado.
- **No re-corro lint/build/test** — la verificación local ya pasó cuando el chat se cerró originalmente con `/end`.

## Heurísticas de la "razón" del rollback

El segundo arg después de `rollback` debería ser **corto** (1-2 líneas) y **factual**:

| ✅ Correcto | ❌ Incorrecto |
| --- | --- |
| `"smoke test detectó NPE en hub con correlationId vacío"` | `"se rompió todo y no sé por qué"` |
| `"telemetría 72h mostró drift >2x del threshold, abortar bajada"` | `"hay que volver a hacerlo"` |
| `"jefe pidió que el menú vuelva al diseño anterior"` | `"el jefe dijo que no"` |

La razón se preserva en git history y en el brief — futuros chats la leen para entender el context del rollback.

## Relación con backlog-hygiene

- Bucket `awaiting-prod/` tiene **límite blando 8** y **edad crítica 14d**.
- Si un brief lleva >14d en el bucket, `/triage` lo marca como `VIEJO` y sugiere:
  - El deploy nunca ocurrió → mover a `waiting/` (bloqueo externo).
  - El deploy ocurrió pero no se acuerda si verificó → forzar verificación o asumir ✅ y `/verify` directo.
- `backlog-check.sh` muestra el contador del bucket en cada arranque de sesión.

## Referencias

- [commands/end.md](end.md) — invoca el flujo que rutea a `awaiting-prod/` cuando aplica el gate post-deploy.
- [commands/triage.md](triage.md) — reporta el bucket en cada barrido.
- [rules/backlog-hygiene.md](../rules/backlog-hygiene.md) — límite y edad crítica.
- [hooks/backlog-check.sh](../hooks/backlog-check.sh) — telemetría no-bloqueante.
