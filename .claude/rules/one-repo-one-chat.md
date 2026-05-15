# one-repo-one-chat (override de educa-web)

> Política universal: ver `~/.claude/rules/one-repo-one-chat.md`.

## Excepción documentada: chats cross-repo desde `educa-coord/`

Un brief que vive en `educa-coord/chats/running/` y toca `educa-web/` **cuenta como un chat activo** sobre este repo aunque el archivo del brief no esté físicamente en `educa-web/.claude/chats/`.

Razón: el chat cross-repo edita el mismo working tree de `educa-web/` que un chat local. Dos chats simultáneos (uno local + uno cross-repo) editando este repo siguen siendo peligrosos — el de cross-repo no se entera de los cambios del local y viceversa.

## Cómo aplica

Antes de hacer `/start-chat` en `educa-web/.claude/chats/open/`:

1. Verificar que `educa-web/.claude/chats/running/` está vacío.
2. Verificar que `../educa-coord/chats/running/` está vacío **o** que su brief no tiene `educa-web` en `repos:`.
3. Si hay un brief cross-repo activo tocando `educa-web/`, esperar a que se cierre o pausar con `/block-chat`.

## Cuándo NO aplica

- Brief cross-repo en `educa-coord/chats/running/` que **solo** toca `Educa.API` (no incluye `educa-web` en `repos:`). Ese chat no edita `educa-web/`, así que un chat local FE puede correr en paralelo.
- Brief cross-repo en `educa-coord/chats/waiting/` o `educa-coord/chats/awaiting-prod/`. No están activos.

## Ver también

- [`../../../educa-coord/COORD.md`](../../../educa-coord/COORD.md) §8 — la excepción del lado coord.
- [`backlog-hygiene.md`](backlog-hygiene.md) — gate duro `running/ ≤ 1`.
