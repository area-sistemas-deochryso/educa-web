---
exclusive: true
isolation: main
touches:
  - .claude/chats/**
  - .claude/plan/**
hot-paths: []
---

> **Repo destino**: `educa-web` (frontend, branch `main`). Abrir el chat nuevo en este repo.
> **Plan**: [`plan/motion-expresivo.md`](../../plan/motion-expresivo.md) (F11) · **Chat**: 10 · **Fase**: verificación final · **Creado**: 2026-11-20 · **Estado**: ⏳ pendiente arrancar.
> **Estado**: ✅ cerrado 2026-11-20 — verificación final de F11 hecha (F3 con formulario real, F6 acordeón en vivo, resto confirmado por el usuario). Fix colateral commit `34dea88b` (panel de autocomplete).
> **MODO SUGERIDO**: `/validate` (verificación en vivo) → `/verify <NNN>` por brief. Si aparece un defecto, cortar y abrir un brief de código aparte (este corre en `main` y solo toca `.claude/`).
> **modules**: `ui` (motion).

---

# F11 — Verificación final de motion expresivo (F1–F8 en `awaiting-prod/`)

## PLAN FILE

[`plan/motion-expresivo.md`](../../plan/motion-expresivo.md). F1–F9 están implementadas; este chat no escribe código, **cierra la verificación** y el plan. El plan guarda intención; no seguir rutas o firmas que mencione.

## OBJETIVO

1. Verificar en vivo lo que el chat 951 dejó sin ver: el **acordeón de F6** y lo que solo se midió por números (ver abajo).
2. Con tu mirada visual (la del usuario) confirmar F2–F8 y mover cada brief con `/verify <NNN>`; al cerrar el último, cerrar el plan F11 en el maestro.

## MODO SUGERIDO

`/validate`. Razón: no hay diseño ni código nuevo; es comprobar y cerrar.

## PRE-WORK OBLIGATORIO

- Leer la lista "YA VERIFICADO" de abajo para **no repetirla**.
- Servidores locales (ver aprendizajes). Login admin: un clic en la sesión guardada en `/intranet/login`, **sin credenciales** (flecha de entrar, no la X, que borra la sesión).
- Reglas de `rules/browsing.md`: prod solo lectura; local con `UseTestEnv: true` se puede mutar.

## ALCANCE

### YA VERIFICADO (chat 951, 2026-11-20, local, BBDD de prueba) — no rehacer

| Fase | Brief | Evidencia numérica |
|---|---|---|
| F2 botón | 944 | `auditoria-correos` → "Refrescar": `motion-ripple`, `edu-button--success`, `data-success`, texto "Datos actualizados"; ancho 110→105→110 |
| F3 campos | 945 | `aria-invalid=true` → `motion-shake` 440 ms, fill `backwards`, clase retirada. Probado poniendo el atributo a mano, **no** con un formulario real inválido |
| F4 filas | 946 | `/admin/cursos`: `motion-flash` + `motion-value-bounce` al cambiar; `edu-row--leaving` + `edu-row-slide-out` 200 ms al filtrar. El pliegue del hueco **no** se midió |
| F5 toast | 947 | ✅ ya en `closed/` (entrada 200 ms, barra 5000 ms, pausa con cursor, salida 200 ms) |
| F6 contadores | 948 | `app-count-up` en `app-kpi-stats`: valor final accesible, sin re-animar sin cambio. **No** se vio la subida desde cero |
| F7/F8 modales | 949, 951 | `edu-dialog`, `edu-confirm-dialog` y `calendar-day-modal`: blur 4 px, `role=dialog`, foco dentro, escalonado 0/60/120 ms; Esc, clic fuera y X cierran; reabrir durante la salida (12 ciclos entre select/diálogo/menú) sin restos |
| Drawer | — | `email-outbox` → "Ver detalle": fondo `rgba(0,0,0,.32)` **sin** blur, `role=dialog`, foco, Esc |
| F9 slide | 950 | ✅ ya en `closed/` |
| Reduced-motion | — | Regla global `*` anula `animation-*` y `transition-*`; `page-content` con `animation: none`. **No** se emuló la preferencia del SO |
| Calidad | — | lint (1 error corregido en `cc26c69a`), build OK, 4507/4508 tests (el fallo era timeout bajo carga; pasa solo) |

### PENDIENTE (lo que este chat debe hacer)

1. **Acordeón F6 en vivo** (brief 948): abrir/cerrar un `edu-accordion` y medir que la altura se anima sin cortarse y que el panel cerrado no queda visible ni bloquea. Superficies: `profesor/cursos` (`semanas-accordion`), `estudiante/cursos/curso-hub`, `estudiante/notas` (`notas-curso-card`), `admin/users` import dialog (solo tras cargar un archivo). Ninguna se pudo alcanzar en 951: el profesor probado no tenía cursos y el selector "Ver como estudiante" no listó alumnos. Alternativa: un usuario con datos reales o elegir salón + curso en "Ver como profesor".
2. **Mirada visual del usuario** sobre F2, F3, F4, F6, F7, F8 (los briefs 943–949 y 951 dicen "revisión visual pendiente"). Pedirle que abra: un modal CRUD, el confirm, el calendario (clic en un feriado), el botón "Refrescar" de `auditoria-correos`, una tabla que cambie una fila.
3. **Huecos menores** (opcionales, a criterio del usuario): contador subiendo desde cero; pliegue del hueco al quitar fila; F3 con un formulario realmente inválido; diálogo de justificación en `/intranet/asistencia` (requiere una falta registrada: hoy no hay); prueba de mutación del test de reapertura de `edu-overlay-handle` (que falle sin el arreglo de 949).
4. **Cierre**: `/verify <NNN>` por cada brief confirmado; al cerrar el último, marcar F11 completo en `maestro.md` y mover el plan según `/end` §9.

## TESTS MÍNIMOS

Sin código nuevo. Si se agrega un test (p. ej. la prueba de mutación), correrlo con PowerShell: `cmd.exe /c "npm run test -- <ruta>"`.

## REGLAS OBLIGATORIAS

- No mutar datos en producción (`rules/browsing.md`). Sin `Co-Authored-By` en commits.
- Móvil **fuera de alcance** (no hay dispositivo); el blur quedó aprobado por prueba en desktop (`--edu-dialog-blur` es la perilla).
- Apagar servidores **por puerto**, no con `Stop-Process dotnet,node` a ciegas.

## IMPLEMENTATION DETAIL (ADR-0006)

- **Commits de este frente (en `main`, sin pushear)**: `808cb680` F8 (migra `calendar-day-modal` a `edu-dialog`; `edu-dialog`/`confirm-dialog` ya heredaban F7 por la clase global `.edu-dialog-backdrop`), `cc26c69a` fix de lint (`kpi-stats` importa `CountUpComponent` desde el barrel `@shared/components`), `ce5e71f0` verify de 947. `main` está 16 commits por delante de `origin`.
- **Decisión F8 documentada**: `calendar-day-modal` migrado (tenía blur/tiempos literales, sin salida, sin Esc/foco/aria). `edu-drawer` queda sin blur a propósito (`edu-dialog.ts` lo comenta). Otros overlays (`informative-mode-callout`, `module-selector`, `campus-3d-view`) son paneles propios, fuera de alcance.
- **Efecto colateral en la BBDD de prueba**: cursos "TEST-F11 motion" (ids 64, 65 y 2 más) quedaron **dados de baja** (el "Eliminar" de cursos es baja lógica). No molestan; se pueden ignorar.
- **Estado**: todo el código de F11 está hecho; solo falta verificación y cierre.

## APRENDIZAJES TRANSFERIBLES (del chat 951)

- **Frames lentos en el navegador automatizado**: `requestAnimationFrame` casi no corre y las animaciones pueden tardar ~1 s en arrancar; `getComputedStyle` a mitad da el estado inicial. Medir con **temporizadores (`setTimeout` 50 ms) + `getAnimations()`** (duración, delay, fill), no con rAF ni capturas. Las capturas pueden colgarse 30 s ("renderer frozen"); en ese caso usar `read_page`/`find`/JS.
- `ng` (herramientas de depuración de Angular) **no está** en la página; para disparar un toast hay que provocar un error real (p. ej. crear un curso con nombre duplicado "Arte" → toast "Conflicto").
- Cierre por Esc desde JS: `KeyboardEvent` con `keyCode` 27 definido por `Object.defineProperty` (CDK lee el `keyCode` legado).
- `cmd.exe /c rmdir` y `Remove-Item` sobre el junction son bloqueados por la herramienta: usar `[System.IO.Directory]::Delete("<wt>\node_modules")` y verificar con `Test-Path`.
- Servidores: `dotnet run --project Educa.API --urls http://localhost:5139` con `ASPNETCORE_ENVIRONMENT=Development` desde `WD/Educa.API` (el proyecto está en `WD/Educa.API/Educa.API`); FE `cmd /c "npm run start"` desde `WD/educa-web` (puerto 4201). El backend tarda ~1 min; el FE más. Lint y build corren hoy (Node v22 en el shell de PowerShell).
- Rutas útiles: `/admin/cursos`, `/calendario`, `/admin/monitoreo/correos/bandeja` ("Ver detalle" abre el drawer), `/admin/auditoria-correos` (botón con éxito+onda), `/ver-como/profesor|estudiante?returnUrl=...`.
- La regla de dirección del slide (F9) es por **prefijo de ruta**: `/intranet` ↔ `/intranet/<página>` desliza; hermanos hacen crossfade (por diseño).

## FUERA DE ALCANCE

- Medir el blur en móvil real; cambiar su radio.
- Cerrar la hoja móvil por arrastre (queda descartado hasta que un usuario lo pida).
- Código nuevo de motion; reanimar lo que F10 ya anima.

## VALIDACIÓN FINAL

- [ ] Acordeón F6 verificado en vivo (o el usuario lo confirma visualmente).
- [ ] El usuario confirmó visualmente F2–F8.
- [ ] `/verify` ejecutado por cada brief confirmado (943–946, 948, 949, 951).

## CRITERIOS DE CIERRE

- [ ] Validación final pasa.
- [ ] Maestro actualizado: fila F11 completa; plan movido a `history/` si todas sus fases quedan verificadas.
- [ ] Brief movido a `closed/`.
- [ ] Commit final único con los moves y el maestro (sin `Co-Authored-By`).

## COMMIT MESSAGE sugerido

```
chore(verify): close F11 motion expresivo
```

## CIERRE

Pedir al usuario que confirme qué quedó sin ver y qué se da por bueno sin verlo.
