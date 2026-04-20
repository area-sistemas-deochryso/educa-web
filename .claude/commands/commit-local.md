# Commit Local (ambos repos)

Crear commits en **ambos repos** (frontend + backend) sin push.

1. Revisar cambios en ambos repos (`git status` en cada uno)
2. Crear commit en frontend (educa-web → main)
3. Crear commit en backend (Educa.API/Educa.API → master)
4. NO hacer push — solo commits locales

Seguir Conventional Commits en ambos. Agregar archivos por nombre, no con `git add .`.

## Idioma del mensaje — inglés obligatorio

A partir de 2026-04-20 todos los mensajes de commit nuevos (front y back) se redactan en **inglés**.

- Excepción única: nombres propios del dominio en español (módulos, pantallas, entidades, tablas, invariantes) van **entre comillas** y en español tal cual.
- Scopes de Conventional Commits son identificadores técnicos y no llevan comillas aunque sean en español.

Ver detalle y ejemplos en `commit-front.md` y `commit-back.md`.
