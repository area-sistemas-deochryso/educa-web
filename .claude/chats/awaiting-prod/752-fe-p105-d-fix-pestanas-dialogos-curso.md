# 752 — FE: P105 D — BUG: los diálogos de curso no renderizan pestañas ni "Ver salón"/"Ver asistencia" (`edu-tabs` + div envoltorio)

> **Repo destino**: `educa-web` (frontend, branch `main`). Abrir el chat nuevo en este repo.
> **Plan**: 105 · **Chat**: D-bugfix · **Fase**: previa a D1 · **Creado**: 2026-10-01 · **Estado**: ✅ implementado, esperando smoke post-deploy
> **Origen**: brief 748 (investigación D, coord) · autorizado por el usuario el 2026-10-01
> **Plan file**: `educa-coord/plans/xrepo/100-119/xrepo-105-backlog-ux-sesion-20260820.md` § Diseños → D
> **depends_on**: — (independiente de 750 y 751; ver "Coordinación")
> **MODO SUGERIDO**: `/execute` → `/validate` (diseño mínimo de ~10 min dentro del chat: ver "Decisión abierta")
> **exclusive**: `false`
> **isolation**: `worktree`
> **modules**: `academic`
> **touches**:
>   - `educa-web`: `src/app/features/intranet/pages/estudiante/cursos/components/curso-content-readonly-dialog/**`
>   - `educa-web`: `src/app/features/intranet/pages/profesor/cursos/components/curso-content-dialog/**`

## OBJETIVO

Que los dos diálogos de curso (estudiante y profesor) vuelvan a mostrar sus tres pestañas (Contenido, Calificaciones, Información) y los botones "Ver salón" y "Ver asistencia". Es un **bug en producción** desde 2026-08-24, no una mejora de diseño.

## SÍNTOMA (confirmado en vivo, 2026-10-01, ambos roles, BBDD de TEST)

- En el diálogo de un curso solo se ve el contenido de la pestaña "Contenido". No hay cabecera de pestañas ni botones de navegación. **Calificaciones e Información son inaccesibles** desde el diálogo.
- DOM: `edu-tabs` = 1, `edu-tab` = **0**, `.tabs-header-row` **no existe**, botones "Ver asistencia"/"Ver salón" = 0.

## CAUSA (verificada)

`edu-tabs` (`shared/edu-ui/lib/tabs/edu-tabs.ts`) proyecta con `<ng-content select="edu-tab">` y `<ng-content select="edu-tabpanel">`: solo recibe hijos **directos** de esos dos tipos. En ambos diálogos los `edu-tab` y los dos botones están dentro de `<div class="tabs-header-row">`, hijo directo de `edu-tabs`, que no coincide con ningún selector y se descarta entero.

Origen: commit `2ef1148a` (2026-08-24, migración PrimeNG→edu-ui ronda 3). Con PrimeNG `p-tabs` el wrapper era válido. Ya está en `origin/main`.

## ALCANCE

- Los 2 archivos `.html` (y su `.scss` de `.tabs-header-row`) de los diálogos de curso.
- **Auditoría ya hecha** (script sobre `src/**/*.html`, 2026-10-01): de 24 usos de `<edu-tabs`, 14 tienen `edu-tab`/`edu-tabpanel` directo, 8 usan `@for` como primer hijo (la proyección con control flow funciona; no se verificó cada uno en vivo) y **solo estos 2 usan `<div>`**. No hay más sitios afectados.

## DECISIÓN ABIERTA (resolver al arrancar, ~10 min)

Cómo conservar el layout "pestañas a la izquierda, links a la derecha" sin romper la proyección:

| Opción | Qué es | Trade-off |
|---|---|---|
| (a) recomendada | `edu-tab` directos dentro de `edu-tabs`; los dos botones salen a un contenedor hermano posicionado con CSS en la misma fila | Solo FE, sin tocar `edu-ui`. Hay que cuidar el layout responsive. |
| (b) | Extender `edu-tabs` con un slot de acciones (`<ng-content select="[tabsActions]">`) | Limpio y reutilizable, pero `edu-ui` es vendorizado de `educa-libs`: hay que reflejarlo allá. Evitar salvo decisión explícita. |

## TESTS MÍNIMOS

- Spec de render de cada diálogo: con contenido cargado hay 3 `edu-tab` y los dos botones ("Ver salón", "Ver asistencia") visibles; los botones llaman a `onVerSalon()` / `onVerAsistencia()`.
- Spec de cambio de pestaña: seleccionar "Información" muestra su panel.
- Opcional (guardrail): una regla de lint/spec que prohíba un hijo directo de `edu-tabs` que no sea `edu-tab`/`edu-tabpanel`/control flow. Evaluar si compensa.

## VERIFICACIÓN EN VIVO (obligatoria, desde worktree)

Como estudiante y como profesor: abrir un curso, confirmar 3 pestañas, cambiar a Calificaciones e Información, y que "Ver asistencia" y "Ver salón" navegan con `horarioId` y vuelven correctamente. En móvil (ancho ≤ 600 px) comprobar que los botones no desbordan.

Notas de entorno (de 748): la ventana de Chrome debe estar **visible**; con la ventana ocluida `captureScreenshot` se cuelga y componentes que dependen de frames (pestañas, menús) no pintan. Si pasa, inyectar una animación CSS mínima en la página fuerza frames. Sesiones guardadas en `/intranet/login`: estudiante (1 curso) y profesora (3 cursos); no se tipean credenciales.

## REGLAS OBLIGATORIAS

- Standalone + `OnPush`, `inject()`, signals, alias `@app/@core/@shared/...`.
- No tocar `shared/edu-ui/**` salvo decisión explícita (opción b).
- **Código en inglés, UI en español.**
- **Deploy**: push a `main` de `educa-web` = deploy automático a prod. No pushear sin confirmación del usuario.

## COORDINACIÓN

- 751 (G F2) toca `profesor/cursos/components/{semanas-accordion,...}`, no los `.html` de los diálogos: sin solape de archivos, pero ambos pasan por `pages/profesor/cursos/`. Si se corren en paralelo, un chat por vez en cada archivo.
- Este fix **precede** a D1 (hub por curso): el hub reutiliza la estructura de pestañas de estos diálogos.

## FUERA DE ALCANCE

- Promover el diálogo a página o hub (es D1, requiere su propio diseño y una investigación de BE previa).
- Descomponer los diálogos pesados (D2).

## RESULTADO (cierre 2026-10-02)

> **Validación prod**: ⏳ pendiente desde 2026-10-02

- Opción (a): `edu-tab` directos en `edu-tabs`; "Ver salón"/"Ver asistencia" en `.tabs-header-links`, hermano posicionado sobre la fila de pestañas (≥601px) y fila propia arriba (≤600px).
- Tests: guardrail `shared/edu-tabs-template-guard.spec.ts` (falla con el código viejo) + render spec del diálogo estudiante. Suite completa 283 archivos verdes, lint y build OK.
- Verificado en vivo (local, BBDD test): estudiante (3 pestañas, cambio a Información, "Ver asistencia" con `horarioId`, móvil 420px sin overflow).
- **Pendiente smoke**: diálogo de la profesora (3 pestañas, botones, cambio de pestaña) y "Ver salón" en vivo.
