# 467 — Auditoría visual + funcional: Perfil Administrador

> **Repo destino**: `educa-web`
> **Creado**: 2026-07-17 · **Modo sugerido**: `/investigate` primero para el hallazgo 0 (alcance de 185 archivos, ver abajo); los hallazgos 1 y 2 son `/execute` directo
> **Plan**: —
> **exclusive**: `false`
> **isolation**: `false`
> **touches**:
>   - **Hallazgo 0 (alta severidad)**: hasta 185 archivos `.scss` en todo `src/app/` que usan `var(--blue-*)`/`var(--red-*)`/`var(--green-*)`/`var(--yellow-*)`/`var(--surface-*)` sin el prefijo `--p-` — alcance real sin confirmar archivo por archivo, requiere `/investigate`
>   - `src/app/features/intranet/pages/cross-role/ctest-k6/models/ctest-k6.constants.ts` (línea 8 y 123)
>   - `src/app/config/environment.development.ts` (línea 10, comentario desactualizado)
>   - Backend: tabla/seed de roles del sistema (`descripcion` de Coordinador Académico, Apoderado, Administrador) — fuera del repo `educa-web`, documentar puntero para BE

## Contexto

Última auditoría de la sesión (ver briefs 463 Login/Header, 464 Estudiante, 465 Profesor, 466 Director). Cuenta: `CODE CLAUDE` (Administrador, sesión de prueba dedicada en TEST DB para este agente). El usuario aclaró que Administrador ve los 3 grupos de menú completos (Estudiante/Profesor/Administrador) porque necesita acceso universal — pero los grupos Estudiante y Profesor ya fueron auditados a fondo con las cuentas reales de esos roles (briefs 464/465) y frecuentemente fallan por falta de relación de datos al navegar como Administrador (esperado, no se re-audita). Este brief cubre exclusivamente los **6 ítems que solo Administrador ve y Director no**: Diagnóstico de BD, Salud del runtime, Test k6, Monitoreo, Permisos (Por Rol / Por Usuario).

## Scope

### 0. Variables CSS `--blue-800`/`--red-600`/`--surface-300`/etc. sin prefijo `--p-` no resuelven — colores de estado rotos en potencialmente toda la intranet (alto)

Verificado en vivo probando el flujo completo de Monitoreo (ver contexto abajo): la página "Eventos correlacionados" (`/intranet/admin/correlation/:id`) define un banner destacado para el Correlation ID activo con `background: var(--blue-100); border: 1px solid var(--blue-800); color: var(--blue-800);` (`correlation.component.scss:70-81`), pero en pantalla se renderiza **sin color en absoluto** — fondo transparente, borde y texto negro por defecto del navegador, indistinguible del resto de la página.

Confirmado con JavaScript en el navegador (`getComputedStyle`):

```js
getComputedStyle(document.documentElement).getPropertyValue('--blue-100') // → "" (vacío)
getComputedStyle(document.documentElement).getPropertyValue('--blue-800') // → "" (vacío)
getComputedStyle(document.documentElement).getPropertyValue('--red-600')  // → "" (vacío)
getComputedStyle(document.documentElement).getPropertyValue('--surface-300') // → "" (vacío)
// en cambio, con el prefijo real de PrimeNG Aura (app.config.ts:27, `import Aura from '@primeng/themes/aura'`):
getComputedStyle(document.documentElement).getPropertyValue('--p-blue-500') // → "#3b82f6"
getComputedStyle(document.documentElement).getPropertyValue('--p-blue-100') // → "#dbeafe"
getComputedStyle(document.documentElement).getPropertyValue('--p-red-600')  // → "#dc2626"
```

**Causa raíz**: el theme activo (`Aura` de `@primeng/themes/aura`, ver `app.config.ts:72`) expone sus tokens de color con el prefijo `--p-` (`--p-blue-500`, `--p-red-600`, etc.) — es el naming propio de PrimeNG v18+. El código del proyecto (incluido `design-system.md` sección 7 "Tokens de color") usa la convención sin prefijo (`--blue-800`, `--red-600`, `--surface-300`), que **nunca fue definida en ningún archivo global del repo** (confirmado: `grep "--blue-100:"` y `grep "--blue-800:"` en todo `src/` → 0 resultados). No hay ningún archivo de alias/mapeo que traduzca `--blue-800` → `var(--p-blue-800)`.

**Alcance**: `grep -r "var(--(blue|red|green|yellow|surface)-\d"` sobre `src/**/*.scss` devuelve **185 archivos**. No se verificó archivo por archivo si cada uso resulta en un color visualmente roto (algunos podrían tener un valor de fallback, heredar color de un padre, o el elemento podría no ser visible en la mayoría de los flujos), pero el patrón de la variable inexistente es sistemático y se confirmó reproducible en al menos este caso concreto. Requiere `/investigate` dedicado para:
1. Confirmar cuántos de los 185 usos producen una regresión visual real (vs. casos donde el fallback no es perceptible).
2. Decidir el fix: ¿agregar un archivo de alias global (`--blue-800: var(--p-blue-800)`, etc. para toda la paleta usada) — más rápido y centralizado — o migrar los 185 archivos al naming `--p-*` directamente — más alineado con la convención real de PrimeNG pero mucho más trabajo?
3. Actualizar `design-system.md` sección 7 con el naming correcto una vez decidido, para que no seguir arrastrando el error en código nuevo.

**Cómo se descubrió**: en esta sesión se probó deliberadamente el flujo de auto-reporte de errores (`Ctrl+Alt+F` / botón "Reportar") para verificar que un error real (400 en `/api/campus/pisos`) quedara correctamente enlazado por Correlation ID entre "Reportes de Usuarios" y "Trazabilidad de Errores" — el enlace SÍ funciona perfectamente en ambos sentidos (confirmado: pill clickeable `app-correlation-id-pill` en el detalle del reporte navega a `/intranet/admin/correlation/:id`; el detalle de la ocurrencia del error tiene "Ver eventos correlacionados" con el mismo destino; la vista central de Timeline los une correctamente). El problema no es la lógica de correlación — es puramente visual: el pill clickeable (`correlation-id-pill.component.scss`) usa `styleClass="tag-neutral"` con `filter: brightness(0.95)` como único feedback de hover, y sin `--blue-*`/`--red-*` resolviendo, varios elementos de esta zona (banner de correlation id, posiblemente el tag "tag-neutral" también) pierden la jerarquía visual pensada — de ahí que el Correlation ID "parezca texto plano" en vez de un enlace.

### 1. Herramienta "Test k6" genera scripts contra un puerto local obsoleto (medio)

`/intranet/ctest-k6` → paso "Configuración" → selector "URL Base" tiene 2 opciones: **"Local (localhost:7102)"** (seleccionada por defecto) y "Producción (Azure)". El valor local está hardcodeado en `ctest-k6.constants.ts`:

```ts
export const BASE_URL_OPTIONS = [
	{ label: 'Local (localhost:7102)', value: 'https://localhost:7102' },
	{ label: 'Producción (Azure)', value: 'https://educacom.azurewebsites.net' },
];
// ...
baseUrl: environment.production ? 'https://educacom.azurewebsites.net' : 'https://localhost:7102',
```

Es el **mismo puerto/protocolo (`https://localhost:7102`) que resultó no funcionar** al arrancar el backend local en esta misma sesión (ver brief 463, nota de contexto) — el backend de este entorno de desarrollo solo escucha en `http://localhost:5139`. Cualquier desarrollador que use esta herramienta para generar un script de carga contra "Local" sin darse cuenta de que el valor por defecto está desactualizado, genera un script que falla contra el backend real.

El comentario en `environment.development.ts:10` también quedó desactualizado con la misma referencia: `// API Configuration - same-origin via proxy (proxy.conf.json redirige /api → localhost:7102)` — documentación que ya no coincide con el proxy real (corregido a `http://localhost:5139` en esta sesión).

**Fix acotado**: actualizar `BASE_URL_OPTIONS` y el comentario de `environment.development.ts` al puerto/protocolo real. Si el puerto local puede variar entre máquinas de distintos desarrolladores, considerar leerlo de `environment.apiUrl`/config en vez de hardcodearlo como string literal.

### 2. Descripciones de rol inconsistentes en "Gestión de Permisos" — 3 de 8 usan placeholder genérico (bajo)

`/intranet/admin/permisos/roles` (tab "Por Rol"), tabla de 8 roles: 5 tienen descripción específica y con sentido de negocio (`Estudiante`: "Acceso a información académica personal", `Profesor`: "Gestión de clases, asistencia y calificaciones", `Asistente Administrativo`: "Apoyo en gestión administrativa y operativa", `Promotor`: "Promotor de la institución", `Director`: "Acceso completo al sistema administrativo"). Los otros 3 — **`Coordinador Académico`, `Apoderado`, `Administrador`** — muestran el texto genérico **"Rol del sistema"**, que lee como un placeholder de seed/migración nunca completado, visible directamente en una tabla de administración que cualquier Administrador puede consultar.

**Out of scope de este repo**: la fuente de este texto es la tabla/seed de roles en backend, no un archivo de `educa-web`. Documentar como hallazgo cross-repo — requiere actualizar el dato en `Educa.API` (o su seed), no hay fix de frontend posible acá.

## Verificado, NO es bug (puntos positivos a preservar)

- **Mecanismo de correlación Reporte↔Error funciona perfectamente end-to-end**: se probó deliberadamente el flujo completo — trigger de un error real (400 en Campus) → botón "Reportar" detecta el error reciente y ofrece enlazarlo automáticamente → aparece en "Reportes de Usuarios" con contador actualizado → la ocurrencia exacta aparece en "Trazabilidad de Errores" agrupada por fingerprint → el Correlation ID conecta ambos registros y lleva a una vista central ("Eventos correlacionados") con timeline cronológico uniendo Reporte + Error(es). El único problema real de esta cadena es visual (ver hallazgo 0: colores rotos hacen que el pill clickeable parezca texto plano), no funcional — el enlace de datos y navegación es correcto en ambos sentidos.
- **Dashboard de Inicio sin widget "Asistencia de Hoy"**: a diferencia de Director, el dashboard de Administrador solo muestra "Accesos Rápidos" (Asistencia, Usuarios, Cursos, Horarios) sin el resumen agregado de asistencia del día. Diseño razonable — Administrador es más una consola de herramientas de sistema que un dashboard operativo diario; no se documenta como bug sin confirmación de que se esperaba lo contrario.
- **Guard "Acceso denegado" en `/intranet/admin/monitoreo` visto desde Director** (brief 466) se confirma coherente: Administrador sí tiene la capability y accede sin problema al mismo hub.
- **Hub de Monitoreo**: interfaz completa y funcional (Correos/Incidencias/Seguridad con badges de estado, tarjetas de Bandeja/Dashboard del día/Diagnóstico/Blacklist/etc.), datos reales de TEST DB (204 pendientes, 340 errores) — no son bugs de UI, es contenido de la base de prueba.
- **"Salud del runtime"**: sistema de thresholds (OK/WARNING/CRITICAL) funciona correctamente por sección (ThreadPool/Requests/GC); el estado "CRITICAL" visto en Requests (p95/p99 altos) es dato real de runtime local, no un bug de interfaz — fuera de scope de auditoría visual.
- **"Diagnóstico de BD"**: manejo de error correcto y claro (`Error interno: Invalid object name 'sys.dm_db_resource_stats'. (Ref: ...)`) cuando el motor SQL local no soporta esa vista dinámica exclusiva de Azure SQL — limitación esperada de entorno de desarrollo, no bug de producto. El parpadeo inicial de íconos como cuadrados vacíos fue solo un frame de carga de fuente, no un bug real (confirmado con captura 2s después).
- **"Capabilities por Usuario"**: buen mensaje de estado vacío ("Seleccione un rol y busque un usuario para ver y editar sus overrides de capabilities") — mismo patrón positivo ya señalado en brief 466 para "Permisos de Salud", reforzando que es el estándar a seguir donde falte (ver hallazgo 2 de brief 466).
- **Videoconferencias, Eventos, Notificaciones, Usuarios, Cursos, Horarios, Salones**: sin hallazgos nuevos respecto a lo ya cubierto en el recorrido de Director (brief 466) — mismos componentes, mismo comportamiento.

## Out of scope

- Grupos de menú "Estudiante" y "Profesor" vistos desde la sesión Administrador — no se re-auditan, ya cubiertos con cuentas reales en briefs 464/465; navegar con Administrador ahí probablemente rompe por falta de relación de datos (esperado, no bug).
- Fix del texto "Rol del sistema" — requiere cambio en `Educa.API` (seed/tabla de roles), no en este repo.
- Contenido/datos del hub de Monitoreo (204 pendientes, 340 errores) — son datos de TEST DB, no hallazgos de producto.

## Criterio de cierre

- [x] `/investigate` del hallazgo 0 completado: alcance real confirmado en vivo (`getComputedStyle`) — **229 archivos `.scss`, ~2598 usos** (no 185; el brief original solo contaba paleta de color, no tokens semánticos `--surface-card/ground/hover/overlay/border`/`--text-color`). Decisión (confirmada por el usuario): **alias global completo** en `src/styles.scss`.
- [x] Fix del hallazgo 0 aplicado: bloque `:root` "PRIMENG TOKEN COMPATIBILITY SHIM" en `src/styles.scss` reenvía los ~40 nombres legacy a su equivalente real `--p-*`. Cubre los 229 archivos de una sola vez (sin tocar componentes). Verificado en vivo: los 16 tokens críticos (incluidos `--blue-800`, `--red-600`, `--surface-300`, `--text-color`, los 5 semánticos best-effort) resuelven correctamente post-fix.
- [x] `design-system.md` sección 8 actualizada: nota de corrección del root cause + tabla del shim + lista de tokens NO cubiertos (bugs separados, no tocados).
- [x] `BASE_URL_OPTIONS` y comentario de `environment.development.ts` actualizados a `http://localhost:5139` (puerto real confirmado en `proxy.conf.json`).
- [x] Hallazgo de "Rol del sistema" — **corregido directamente en este repo**, no era un bug de backend. Causa real: `permisos-roles.component.html` tiene un `@switch` con solo 5 de 8 `@case` (faltaban Coordinador Académico/Apoderado/Administrador, caían al `@default` "Rol del sistema"). Se agregaron los 3 `@case` faltantes. No se generó brief cross-repo — no aplica.
- [x] Build + lint OK (`npm run lint` sin errores, `npm run build` completo sin errores). Verificado en vivo: dev server levantado, tokens CSS confirmados post-fix vía `getComputedStyle`, sin errores de consola en `/intranet/login`. No se re-verificó el flujo completo de Monitoreo con la cuenta `CODE CLAUDE` (requeriría backend local corriendo + login manual); el fix del hallazgo 0 se verificó a nivel de resolución de tokens CSS (el mecanismo exacto del bug reportado), que es una verificación más fuerte que un screenshot puntual.

## Nota de alcance (post-investigate)

Tokens legacy usados pero **no cubiertos** por el shim (bugs preexistentes, root cause distinto — no tocados en este brief): `--primary-color-rgb` (1 uso, `features/public/contact`, necesita triplete RGB), `--border-radius`, `--font-family-mono`/`--font-family-monospace`, `--font-weight-medium`, `--menu-font-size`, `--intranet-accent-color-blue-hover`/`--intranet-accent-color-red`/`--intranet-border-color`/`--intranet-primary-color`. Candidatos para un brief de limpieza menor aparte si se quiere cerrar el 100%.

## Tiempo estimado

~15-20 min para hallazgos 1 y 2 (fix de config en frontend + puntero cross-repo). El hallazgo 0 depende del resultado de `/investigate`: si el fix es un alias global centralizado, ~30-45 min; si requiere migrar los 185 archivos a `--p-*`, es un esfuerzo mayor a estimar aparte tras el investigate.
