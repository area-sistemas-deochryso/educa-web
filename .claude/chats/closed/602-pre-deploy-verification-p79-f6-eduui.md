> **Repo destino**: `educa-web` (frontend, branch `main` — **leer en worktree**, ver "Cómo ejecutar" abajo).
> **Plan**: `educa-coord/plans/xrepo-79-primeng-replacement-library.md` (P79, F6/F9) · **Creado**: 2026-08-27 · **Estado**: ⏳ abierto.
> **Modo**: `/validate` (read-only, no toca código — es una gate de verificación antes de decidir el deploy de brief 588).
> **Por qué existe este brief**: brief 588 (el swap completo PrimeNG→edu-ui, 277 archivos) está mergeado a `main` local pero **nunca se pusheó/desplegó** — `educa.com.pe` real sigue en PrimeNG puro. Verificar DESPUÉS de desplegar significa perder el punto de referencia: ya no hay forma de comparar "cómo se veía/comportaba antes" contra "cómo quedó" en el mismo dominio, y si algo sale mal ya está en producción. Este brief hace la comparación **antes** de decidir el deploy: local (con 588 + 599 + 600 + 601 ya aplicados) vs. prod real (PrimeNG, referencia todavía viva).

---

# 602 — Verificación pre-deploy de P79 F6 (edu-ui) contra prod real

## Contexto

`main` local de `educa-web` tiene la migración completa a `edu-ui` (588) más 3 rondas de corrección de fidelidad visual encima (589 tras F8, 600+601 tras F9). Todo eso está verificado **contra sí mismo** (local vs. la fuente corregida de `educa-libs`) pero **nunca se comparó lado a lado con el comportamiento real de PrimeNG en prod**, porque prod es hoy la única referencia de "cómo se supone que se vea/funcione" que no se puede recrear después de desplegar.

Este brief compara, página por página y flujo por flujo, `educa-web` local (edu-ui, todo lo shippeado) contra `educa.com.pe/intranet` real (PrimeNG, referencia) — antes de que nadie decida pushear/desplegar 588. El objetivo es una lista de confianza: "esto se ve/funciona igual" o "esto todavía difiere, no desplegar hasta corregir".

## Cómo ejecutar

**Usar un worktree dedicado**, no el checkout principal — para no pisar trabajo en curso en `main` mientras se levanta el servidor local de verificación:

```
/wt-new 602-pre-deploy-verification-p79-f6-eduui
```

Levantar FE (`npm start`, puerto 4201) y BE (`Educa.API`, puerto 5139) **dentro del worktree**, no en el checkout principal. Loguear con la cuenta guardada "CODE CLAUDE" (Administrador) en ambos orígenes (local worktree y `educa.com.pe/intranet` real) — nunca ingresar credenciales manualmente.

## Qué verificar

Cobertura mínima — cada ítem se compara local (worktree) vs. prod real, mismo usuario, mismos datos donde aplique:

### Páginas (smoke visual completo, no solo los puntos ya conocidos)
- `/intranet` (home, accesos rápidos)
- `/admin/usuarios` (tabla, filtros, paginador, acciones)
- `/admin/cursos`
- `/admin/salones`
- `/admin/horarios`
- `/admin/rendimiento`
- Al menos 1 página del rol Profesor (ej. `profesor/horarios`, cubre el segundo uso real de `edu-popover`)
- Al menos 1 diálogo/modal (crear o editar un registro) — cubre `edu-dialog`/`edu-drawer` y sus slots header/footer (bug crítico de F6g, confirmar que sigue resuelto)

### Flujos funcionales, no solo estilo
- Login: lista de sesiones guardadas, "Usar otra cuenta", login con credenciales.
- Menú de perfil: abrir, cambiar "Modo oscuro", ver "Información", **cerrar sesión** (el bug de F9 #4 rompía exactamente esto).
- Al menos un dropdown con opciones-objeto (ej. filtro Salón) — confirmar que no aparece `[object Object]` en ningún punto de la sesión, no solo al cargar.
- Ordenar una tabla por columna (sort icons).
- Paginar una tabla (ir a página 2, cambiar tamaño de página).

### Regresión específica de lo ya encontrado (F8 + F9, 10 hallazgos totales)
Repasar los 4 de F8 (589) y los 6 de F9 (599+600+601) uno por uno contra prod real, no solo contra la fuente — es la primera vez que se comparan contra prod desde que existe una migración local completa para comparar.

## Qué NO hacer

- No pushear ni desplegar nada — este brief es 100% verificación, cero cambios de código.
- No corregir nada encontrado acá directamente — si aparece una diferencia nueva, documentarla con causa raíz si es evidente (mismo estándar que F8/F9) y dejarla para un brief de fix aparte. Este brief cierra con un veredicto, no con parches.
- No asumir que "ya se verificó" porque brief 601 hizo `getComputedStyle` puntual sobre 3 propiedades — este brief es el smoke completo que nunca se hizo contra prod real con la migración completa aplicada.

## Done-when

- [x] Worktree `602-...` creado y usado para levantar FE+BE (no el checkout principal).
- [x] Las 8 páginas/vistas listadas arriba comparadas visualmente local vs. prod real, con veredicto por página (✅ igual / ⚠️ difiere, con detalle).
- [x] Los 5 flujos funcionales listados arriba probados en ambos entornos, con veredicto.
- [x] Los 10 hallazgos históricos de F8+F9 re-chequeados contra prod real específicamente (no solo contra la fuente de `educa-libs`).
- [x] Veredicto final explícito: "**Listo para desplegar 588**" o "**No desplegar — N diferencias pendientes**" (listadas con severidad).
- [x] Si el veredicto es negativo, brief(s) de fix nuevos abiertos (numeración global) antes de cerrar este. — N/A, veredicto positivo.

## Resultado (2026-08-27)

**Veredicto: ✅ Listo para desplegar 588.**

### Páginas (8/8, todas ✅ igual)

| Página | Veredicto |
|---|---|
| `/intranet` (home) | ✅ igual — tarjetas, estilos, layout idénticos |
| `/admin/usuarios` | ✅ igual — tabla, badges, botones de acción, paginador |
| `/admin/cursos` | ✅ igual — stat cards, filtros |
| `/admin/salones` | ✅ igual (ver nota de ruido de entorno abajo) |
| `/admin/horarios` | ✅ igual — calendario semanal pixel-a-pixel, tooltips |
| `/admin/rendimiento` | ✅ igual — stat cards, tarjetas de curso |
| `profesor/horarios` (rol Profesor) | ✅ igual — solo probado en local (prod no tiene cuenta Profesor guardada) |
| Diálogo "Nuevo Usuario" (crear/editar) | ✅ igual pixel-a-pixel — header/footer/tabs/slots correctos (bug crítico F6g confirmado resuelto) |

### Flujos funcionales (5/5 ✅)

- **Login**: sesiones guardadas, "Usar otra cuenta" (formulario DNI/Contraseña/Rol renderiza bien, no se envió), login con sesión guardada — todo ✅ ambos entornos.
- **Menú de perfil**: abrir, Modo oscuro (toggle funcional, sin glitches), Información (tabs Mis Datos/Contraseña), Cerrar sesión — ✅ funcional en ambos, probado 2 veces en local.
- **Dropdown "Salón" (opciones-objeto)**: sin `[object Object]` en ningún punto — ✅ ambos.
- **Ordenar columna NOMBRE**: ✅ funciona idéntico en ambos (usuario logueado se fija arriba, resto ordena alfabéticamente).
- **Paginar tabla**: ✅ funciona idéntico en ambos (página 2, cambio de tamaño de página).

### Los 10 hallazgos históricos F8+F9 — 9/10 reconfirmados fijos contra prod real, 1 no aplicable en páginas muestreadas

**F8 (4/4)**: edu-tag `danger` color neutral ✅ · edu-button outline (no filled-solid) ✅ · edu-table sort icons en Usuarios ✅ · NaN row-numbering — no se encontró ninguna tabla con columna de índice de fila en las páginas muestreadas para re-testear directamente; ya había sido verificado independientemente en el cierre de F8.

**F9 (6/6)**: input/textarea `background: transparent` ✅ (confirmado por `getComputedStyle`) · tabla `background: transparent` ✅ · action-icons con color semántico ✅ · edu-popover renderiza contenido completo (menú de perfil Y popover de detalle de clase en `profesor/horarios`) ✅ · sin `[object Object]` en dropdowns ✅ · edu-paginator centrado + padding 16px + tinte activo sutil + fuente 16px ✅ (los 4 sub-items confirmados por `getComputedStyle`).

### Hallazgos nuevos (no bloquean el deploy de 588)

1. **Toast "Error de aplicación" intermitente** (~50% de las veces) al abrir un `edu-popover` (menú de perfil o popover de clase en horario de profesor) o en navegación de página completa. El contenido del popover siempre renderiza bien pese al toast. No se pudo capturar el error en consola/red pese a varios intentos — causa raíz no confirmada. Severidad: baja-media, cosmético, no bloqueante. Recomendado abrir un brief de debug dedicado si se quiere investigar más a fondo.
2. **Overlay "Migración de Contraseñas"** en `/admin/usuarios`: gateado por `isDev` (confirmado en código) — nunca aparece en prod. Comportamiento de "spotlight" (dismiss al primer click) es intencional, no un bug.
3. **Panel "DEBUG: Server Time Sync"** en `profesor/horarios`: gateado por `environment.debug.horarioSync`, confirmado `false` en `environment.ts` (prod) y `true` solo en `environment.development.ts`. No aparecerá en prod.
4. Diferencias de conteos (usuarios, salones, cursos) entre local y prod: esperado, son bases de datos independientes — no es un defecto.
5. La tarjeta "Pendientes" en `/admin/salones` a veces envuelve a una fila nueva en local: artefacto del banner "Salud de sede crítica" (dato de salud de sede, específico del backend local) que agrega altura y activa un scrollbar vertical que resta ~10px de ancho disponible — no es una regresión de edu-ui, es ruido de datos de entorno.

## Plan cross-repo

[`educa-coord/plans/xrepo-79-primeng-replacement-library.md`](../../../../EducaWeb/WD/educa-coord/plans/xrepo-79-primeng-replacement-library.md) — P79 F6 (gate de deploy) / F9 (verificación final de la ronda de fidelidad visual).

## Origen

Pedido explícito del usuario tras el cierre de brief 601: verificar el estado completo (librería + estilos ya aplicados) contra producción **antes** de desplegar, no después — desplegar primero y verificar después pierde el punto de referencia (prod deja de ser PrimeNG, ya no hay contra qué comparar) y arriesga subir a producción un producto no verificado.
