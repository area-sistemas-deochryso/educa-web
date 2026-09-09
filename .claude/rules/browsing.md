# Navegar y correr el proyecto — prod vs local

## Regla

Al usar `claude-in-chrome` para navegar la intranet, o al levantar el proyecto en local, estas reglas aplican siempre — no hace falta que el usuario las repita en cada chat.

## Producción (`https://educa.com.pe/intranet`)

**Solo explorar, navegar y ver.** Cualquier acción que mute datos — crear un registro, guardar un formulario, activar/desactivar, borrar — está prohibida ahí, directamente, sin pedir confirmación primero: no se hace.

Si una tarea requiere mutar datos "en prod" (ej. verificar que un fix funciona con datos reales), el patrón correcto **no** es hacerlo en la URL pública — es correr el proyecto en local apuntando a la base de datos de producción (`UseTestEnv: false` en `Educa.API/appsettings.json`, patrón validado en brief 528 y automatizado en `/verify-prod` de `educa-coord`). La URL pública es de solo lectura, siempre, sin excepción.

## Local + BBDD de prueba confirmada

Con el proyecto corriendo en local y la BBDD de prueba activa — todo tipo de prueba y operación está permitida: crear, editar, eliminar, flujos completos.

**Confirmar que es BBDD de prueba antes de asumirlo**: `UseTestEnv: true` en el `appsettings` con el que arrancó el backend (`appsettings.Development.json` lo trae por default; si el BE se levantó con otro profile, chequear explícitamente antes de dar por seguro que se puede mutar libremente).

## Login — switcher de sesión

En `/intranet/login` hay un switcher de sesión (mismo mecanismo en prod y en local). Normalmente ya hay una cuenta admin especial guardada y lista — un click en el item guardado alcanza, **sin pedir ni tipear credenciales**. Detalle de esa cuenta: `../educa-coord/.claude/claude-cowork/SETUP-COWORK.md` §3. Si el item guardado no aparece, recién ahí preguntar al usuario.

## Ver también

- `/verify-prod` (`educa-coord`) — flujo estructurado que exercita local+BBDD-prod para cerrar items de `awaiting-prod/`; nunca usa la URL pública porque necesita mutar (crear/desactivar un registro `TEST-`).
- `../educa-coord/.claude/claude-cowork/SETUP-COWORK.md` — credenciales y convención de QA asistido por Cowork (rounds de verificación post-deploy).
