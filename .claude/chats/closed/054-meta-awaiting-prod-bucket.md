# 054 · Meta · Bucket `awaiting-prod/` + comando `/verify`

> **Repo destino**: `educa-web` (frontend, branch `main`) — solo toca `.claude/`, no código de la app.
> **Validación prod**: ✅ verificada 2026-04-28 — dogfood completo: gate visible en `/end`, `/triage` lista 7 buckets, `/verify` cierra el ciclo.
> **Plan**: meta · **Chat**: único · **Fase**: única · **Creado**: 2026-04-27 · **Estado**: ✅ cerrado localmente, en `awaiting-prod/`.
> **MODO SUGERIDO**: `/execute` (diseño cerrado en conversación previa al brief).

## Origen

Observación del usuario en `/triage` 2026-04-27:

> *"me está faltando un estado de planes listos para deploy y en espera de confirmación de datos de producción. Ese es el cuello de botella actual"*

Hoy hay **9 briefs en `closed/` con la nota "Pendiente verificación post-deploy del usuario"**, mezclados con los realmente terminados. No hay forma de filtrar de un vistazo qué necesita validación en prod. Cada chat nuevo paga el costo de releer el maestro para encontrar lo que está atrancado en validación.

## Objetivo

Sumar un **séptimo backlog** dedicado a chats que cerraron localmente (commit hecho, validación local pasó) pero esperan confirmación post-deploy del usuario. Hacerlo visible en el snapshot del hook `backlog-check.sh` para que el bottleneck no quede oculto.

## Decisiones tomadas (en conversación previa)

1. **Bucket nuevo**: `chats/awaiting-prod/` (no es subcarpeta de `closed/` — bucket de primer nivel).
2. **Comando nuevo**: `/verify <NNN> [rollback "razón"]` — default `verify <NNN>` confirma ✅ y mueve a `closed/`. `verify <NNN> rollback "razón"` mueve a `running/` con flag de rollback.
3. **`/end` actualizado**: pregunta "¿requiere validación post-deploy?". Si sí → `awaiting-prod/`. Si no → `closed/` (flujo actual).
4. **Backfill automático**: los briefs identificables en `closed/` con marcador "Pendiente verificación post-deploy" se mueven a `awaiting-prod/` en el commit de cierre.
5. **Límite blando 8** + **edad crítica 14d** (un chat en awaiting-prod >14d sin verificar = señal de que el deploy no ocurrió o se olvidó verificar).
6. **`/go` y `/start-chat` ignoran el bucket** — no consume cola ni compite por ser el running.
7. **Annotación al verificar**: el brief se enriquece con `> **Validación prod**: ✅ verificada YYYY-MM-DD` en la línea siguiente al header al pasar por `/verify`.

## Scope (10 cambios)

| # | Tipo | Archivo |
| --- | --- | --- |
| 1 | C | `.claude/chats/awaiting-prod/.gitkeep` |
| 2 | C | `.claude/commands/verify.md` |
| 3 | M | `.claude/commands/end.md` (gate post-deploy) |
| 4 | M | `.claude/commands/triage.md` (7 buckets en lugar de 6) |
| 5 | M | `.claude/commands/go.md` (note: ignora awaiting-prod) |
| 6 | M | `.claude/commands/start-chat.md` (note: ignora awaiting-prod) |
| 7 | M | `.claude/rules/backlog-hygiene.md` (7 backlogs) |
| 8 | M | `.claude/hooks/backlog-check.sh` (counter + warning) |
| 9 | R×9 | backfill `closed/<NNN>.md` → `awaiting-prod/<NNN>.md` (9 briefs identificables) |
| 10 | M | `.claude/plan/maestro.md` (mención del nuevo bucket en cabecera operativa si aplica) |

## Backfill identificado (9 briefs)

Filtro: maestro o brief mencionan explícitamente "Pendiente verificación post-deploy" o equivalente.

1. `020-plan-27-chat-5-cierre-docs-inv-c11.md` — pendiente validación del jefe
2. `021-plan-27-chat-5c-be-fix-bulk-email-inv-c11.md` — idem
3. `037-plan-31-chat-1-be-bounce-parser-foundation.md` — commit `c46dfa0` sin pushear + validar header X-Educa-Outbox-Id en Roundcube
4. `043-plan-32-chat-2-be-emailoutbox-correlation-id.md` — request admin + SELECT en prod
5. `044-plan-32-chat-3-be-correlation-endpoint-close-out.md` — GET con id real de prod
6. `045-plan-32-chat-4-fe-correlation-hub-pill-wiring.md` — 5 flujos browser post-deploy
7. `051-plan-30b-be-entradas-con-correo-enviado.md` — validado por smoke test del FE adjunto
8. `052-plan-30b-fe-entradas-con-correo-tab.md` — smoke test browser post-deploy
9. `053-plan-35-chat-1-fe-monitoreo-redesign.md` — smoke test browser post-deploy

> El usuario mencionó "11 items" — el conteo era aproximado. Los 9 listados son los que tienen marcador explícito en maestro o brief. Los otros 2 no tienen brief formal en `closed/` (Plan 24 Chat 4 (B) es OPS sin brief; Plan 26 F3 / Plan 28 Chat 3 nunca arrancaron).

## Criterios de cierre

- [x] Bucket `awaiting-prod/` existe y `.gitkeep` está commiteado.
- [x] `/verify` documentado con sintaxis y casos.
- [x] `/end` pregunta el gate post-deploy (caso ship).
- [x] `/triage` reporta 7 buckets.
- [x] `backlog-check.sh` cuenta el bucket y muestra avisos al exceder.
- [x] 9 briefs movidos a `awaiting-prod/` con anotación `⏳ pendiente desde 2026-04-27`.
- [x] Sintaxis bash del hook OK (`bash -n` limpio).
- [x] Snapshot del hook ejecutado manualmente confirma el nuevo bucket en la tabla y dispara aviso `EXCEDIDO (9/8)` (esperado).

## Aprendizajes capturados

### Decisiones de diseño que vale la pena recordar

1. **Bucket de primer nivel, no subcarpeta de `closed/`**: separar `awaiting-prod/` como hermano de `closed/` permite que el hook lo cuente independientemente y que `/triage` lo reporte como bucket dedicado. Si fuera subcarpeta, el contador y los warnings serían más torpes y la separación visual se perdería.
2. **`/verify` como comando separado, no flag de `/end`**: el ciclo `running/ → awaiting-prod/ → closed/` necesita dos cierres distintos en el tiempo (cierre local vs cierre de prod). Mezclarlos en `/end` con flag obligaría a pasar por todo el flujo de cierre dos veces. `/verify` es el "cierre del cierre" — chico, idempotente, con su propio commit chico.
3. **Gate post-deploy con auto-sugerencia heurística**: el flujo de `/end` propone `s` cuando detecta señales ("post-deploy", "smoke test", "validar en prod", "subir a azure", "esperar telemetría", "el jefe valida", o commit sin pushear). Reduce fricción al 0 cuando la respuesta es obvia.
4. **`/go` y `/start-chat` ignoran el bucket explícitamente**: la regla está documentada en cada comando, no implícita. Sin esto, en algún momento alguien (yo o el usuario) se confundiría y trataría el bucket como cola de trabajo nueva.
5. **Backfill consciente, no arbitrario**: el filtro fue "marcador explícito en maestro o brief de pendiente post-deploy" — no se backfilleó todo `closed/` reciente. 9 briefs identificados (los 11 mencionados en la observación original incluían 2 sin brief formal: Plan 24 Chat 4 (B) OPS sin brief, Plan 26 F3 / Plan 28 Chat 3 que nunca arrancaron).
6. **Anotación honesta en backfill**: `⏳ pendiente desde 2026-04-27 (backfill — cierre original anterior, ver git log)` reconoce que la fecha del bucket no es la del cierre real. No mentir al sistema mata la capacidad de detectar items >14d en el futuro.

### Métrica de impacto inmediato

- **Antes**: bottleneck invisible — los 9 chats pendientes de validación post-deploy estaban mezclados en `closed/` con 43 chats realmente cerrados. Sin filtro fácil.
- **Después**: hook reporta `awaiting-prod/ EXCEDIDO (9/8)` en cada SessionStart, dispara warning, sugiere `/triage`. El bottleneck se hizo visible en T+0.
- **Próximo paso del usuario**: ir limpiando con `/verify <NNN>` los que ya validó, o reagrupar a `waiting/` los que el deploy nunca ocurrió.

### Trampa esquivada

Tentación inicial: agregar la métrica como tag inline en `closed/` (opción C que descartamos). Más liviano de implementar, pero el hook tendría que grepear el contenido de cada `.md` para contar pendientes — frágil, costoso, y la separación visual nunca se hace explícita en filesystem. La opción A (bucket dedicado) es más invasiva pero el costo se paga una vez y queda.

### Heurística para futuras observaciones de proceso

> **"Si una nota recurrente aparece en N+ briefs cerrados ('pendiente verificación post-deploy', 'pendiente jefe'), no es nota — es estado faltante. Bucket nuevo o no, formalizar."**

Aplicable también a: "pendiente decisión arquitectura X", "esperando review", "depende de feature flag Y" — cualquier nota que aparezca en >5 briefs es señal de un bucket o status nuevo.

## Pendiente para próximo chat

- Validar manualmente los 4 puntos del flujo nuevo en sesión separada:
  1. Próximo `/end` pregunta gate post-deploy con auto-sugerencia.
  2. `/triage` lista 7 buckets.
  3. `/verify 054` (o cualquiera de los 9 backfilled) mueve a `closed/` con anotación ✅.
  4. `/verify 054 rollback "razón"` mueve a `running/` con flag.

Una vez validado, este brief se mueve a `closed/` con `/verify 054` (`✅ verificada YYYY-MM-DD`).
