# 746 — FE: P105 C — `edu-avatar` con acento de rol (borde/ícono) y helper único de iniciales

> **Origen**: educa-coord chat de diseño P105 · 2026-10-01
> **Repo afectado**: `educa-web`
> **Plan**: `educa-coord/plans/xrepo/100-119/xrepo-105-backlog-ux-sesion-20260820.md` § Diseños → C
> **Created**: 2026-10-01
> **Validación prod**: ⏳ pendiente desde 2026-10-01
> **MODO SUGERIDO**: `/design` (cierra 2 decisiones menores) → `/execute` → `/validate`
> **exclusive**: `false`
> **modules**: `infra`, `users`, `attendance`
> **touches**:
>   - `educa-web`: `src/app/shared/edu-ui/lib/avatar/edu-avatar.{ts,scss}`, `core/services/user/user-profile.service.ts`, `features/intranet/shared/pipes/initials/initials.pipe.ts`, `features/intranet/shared/services/ui-mapping/ui-mapping.service.ts`, `features/intranet/shared/components/layout/intranet-layout/components/{user-profile-menu,user-info-dialog}/**`, `pages/login/login-intranet.component.*`, `pages/admin/users/components/usuarios-table/**`, listas de `/intranet/asistencia` (`attendance-day-list`, `attendance-persona-day-list`)

## Contexto

`edu-avatar` (librería propia `edu-ui`, no PrimeNG) ya es el componente compartido, pero **no tiene input de rol** (`variant` solo `neutral|brand`) y lo usan 2 componentes (`user-profile-menu`, `user-info-dialog`) que ya conocen el rol y lo muestran solo como texto. Hay ≥9 círculos propios (`.user-avatar`, `.session-avatar`, `.student-avatar`, `.avatar`, `.avatar-placeholder`) y **3 cálculos de iniciales duplicados** (`user-profile.service`, `InitialsPipe`, `getInitials()` en `usuarios-table`). Ya existe `getRolSeverity()` (rol → severidad: Director/Administrador `danger`, Profesor `warn`, Apoderado `info`, Estudiante `success`, otros `contrast`).

**Decisión del usuario (2026-10-01)**: el rol se diferencia por **borde o ícono**; el **relleno de color queda reservado al curso** (brief 745). El rol ya se usa realmente en perfil, login, `/intranet/asistencia` y `/intranet/admin/usuarios`.

## Decisiones menores a cerrar al arrancar (`/design`, corto)

1. **Borde vs ícono vs ambos**: propuesta — borde de color por rol (reutiliza la paleta de `getRolSeverity`) como señal principal; ícono solo si el borde no basta (daltonismo: rojo/verde de Director vs Estudiante). Verificar en vivo antes de fijar.
2. **¿Director ≠ Administrador?** El modelo los trata como roles distintos (el brief original decía "admin"). Default propuesto: distintos solo si el usuario lo confirma; si no, comparten acento.

## Scope

1. `edu-avatar`: nuevo input `rol` que mapea a acento de borde/ícono; `variant` y relleno intactos (el relleno lo definirá el color de curso cuando aplique).
2. **Un solo helper de iniciales** (consolidar los 3); `InitialsPipe` y `UserProfileService.initials` lo consumen.
3. Adoptar `edu-avatar` con `rol` en: menú de perfil, diálogo de info de usuario, login (sesiones guardadas), tabla de `/admin/usuarios` (hoy repite el gradiente `brand`), listas de `/intranet/asistencia`.
4. Si mensajería/foro muestra rol, incluirlo; si no, dejarlo fuera.
5. Revisar skeleton (`table-skeleton` `avatar-text`) para que no desalinee.

## Pre-work

- Leer `edu-avatar.{ts,scss}` y `ui-mapping.service.ts` (L20-29, L190).
- Medir en `login` y en `attendance-*-day-list` qué dato de rol llega al componente (en asistencia hoy no se pasa; puede requerir ampliar un modelo de lista).
- `UserRole` está deprecated; `Rol` (`data/models/rol.models.ts`) es interface del BE sin enum. No introducir un tercer modelo: tipar contra el que use cada sitio.

## Out of scope

- Círculos de estudiante en diálogos de profesor (`student-task-submissions-dialog`, `student-files-dialog`, `horario-detail-drawer`, `student-card`): siempre estudiante, el rol no aporta. Se migran a `edu-avatar` `neutral` solo si cuesta cero; si requieren trabajo, quedan para un barrido aparte.
- Color de relleno por curso (brief 745).
- Imagen de avatar real (hoy sin soporte; `img` por `ng-content`).

## Criterio de cierre

- [ ] Decisiones borde/ícono y Director/Administrador registradas en el plan P105.
- [ ] Un único helper de iniciales; 0 duplicados.
- [ ] `edu-avatar` con input `rol` y spec que cubre cada rol del modelo (incluyendo rol desconocido → neutro).
- [ ] 5 sitios adoptados; verificación visual en vivo de cada uno (local, BBDD de prueba, desde worktree), incluyendo dark mode y contraste del borde.
- [ ] lint + build + tests OK.

## Tiempo estimado

~90-120 min.

## Cierre (2026-10-01)

**Decisiones**: borde + ícono-insignia desde el inicio (sin esperar test de daltonismo); Director y Administrador comparten acento (`danger`). Criterio de iniciales: **B** = primer apellido + primer nombre (formato estándar "Apellidos Nombres").

**Hecho**: helper único `getPersonInitials`/`getInitialsFromParts` (`core/helpers/string.utils.ts`); `edu-avatar` con input `rol` (`edu-avatar-rol.ts`, spec por rol + desconocido → neutro); adoptado en menú de perfil, diálogo de info, login, tabla `/admin/usuarios` y diálogo de justificación de las 2 listas de asistencia. Lint 0 errores, build OK, 2767/2768 tests (1 flake de `eslint-config-guards` por carga; pasa solo).

**Pendiente (por eso `awaiting-prod/`)**:
- Verificación visual en vivo de los 5 sitios: dark mode, contraste del borde, insignia no cortada por `overflow` en celdas de tabla, tamaños `large` en login (42→48px).
- Registrar decisiones borde+ícono y Director=Administrador en el plan P105 (`educa-coord`, cross-repo).
- `attendance-persona-day-list`: `tipoPersona` A/C/M/D/N quedan sin rol (neutro) hasta confirmar qué roles son.
- Límite del criterio B: 1 apellido + 2 nombres ("Perez Juan Carlos") da "PC".
