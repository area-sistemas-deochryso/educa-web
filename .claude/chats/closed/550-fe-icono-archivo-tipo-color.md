# 550 — Ícono de archivo: color por tipo incorrecto (.xlsx/.pptx y archivos propios del estudiante)

> **Repos afectados**: `educa-web`
> **Plan**: `.claude/plan/audit-estudiante-navegacion-2026-08.md` (hallazgo `estudiante-audit-icono-archivo-incorrecto`)
> **Creado**: 2026-08-12 · **Estado**: ✅ cerrado.
> **MODO SUGERIDO**: `/execute`
> **exclusive**: `false`
> **modules**: `cursos` (contenido de curso — módulo "Archivos", embebido en `estudiante/cursos` y `profesor/cursos`)
> **touches**:
>   - `educa-web`: `src/app/features/intranet/pages/estudiante/cursos/components/curso-content-readonly-dialog/**`, `src/app/features/intranet/pages/profesor/cursos/components/semanas-accordion/**`, `src/app/features/intranet/pages/profesor/cursos/components/archivos-summary-dialog/**`

## Contexto

Hallazgo del audit funcional F1 (`estudiante-audit-icono-archivo-incorrecto.md`): `.xlsx` mostraba el ícono de Word en vez de Excel en el listado de "Archivos" del contenido de curso.

## Root cause (2 bugs distintos, mismo síntoma superficial)

1. **Orden de checks por substring en `getFileIcon`/`getFileIconClass`**: el MIME de Office moderno (`application/vnd.openxmlformats-officedocument.*`) contiene la substring `"document"` para **cualquier** tipo (Word, Excel, PowerPoint), porque el prefijo es literalmente `officedocument`. El check `includes('word') || includes('document')` se evaluaba antes que `excel`/`sheet` y `presentation`/`powerpoint`, así que todo lo que no fuera PDF/imagen/video caía en "Word". Afectaba `.xlsx` y `.pptx` por igual.
2. **`.row-icon.student-file` (CSS)**: regla que forzaba fondo/ícono verde en cualquier archivo subido por el propio estudiante ("Mi Entrega" / "Mis Archivos"), sin importar su tipo real — pisaba el color correcto de `.word`/`.excel`/etc. por orden de cascada (misma especificidad, definida después). Un `.docx` propio se veía verde en vez de azul.

Bug duplicado (copy-paste) en 3 componentes: `curso-content-readonly-dialog` (estudiante), `semanas-accordion` y `archivos-summary-dialog` (profesor).

## Scope

### educa-web
- Reordenar los checks de tipo en los 3 componentes: `pdf` → `image` → `video` → `excel/sheet` → `presentation/powerpoint` → `word/document` (fallback).
- Eliminar la regla CSS `.row-icon.student-file` y su uso en el HTML de `curso-content-readonly-dialog` — el color del ícono debe depender solo del tipo de archivo, no de quién lo subió.
- Agregar clase `.ppt` (rojo, tokens `--red-50/--red-200/--red-500`) en los 3 componentes — PowerPoint no tenía color asignado (caía en gris genérico).

## Out of scope

- Preview inline de archivos (sigue siendo descarga/apertura externa) — ya estaba fuera de scope en el hallazgo original.
- Dark-mode de los tokens `--word-50`/`--excel-50`/etc. (se evaluó como hipótesis durante la verificación en vivo pero el usuario confirmó que el problema real era el mapeo tipo→color, no el contraste en dark mode — no se tocó).
- Los otros 9 hallazgos del mismo audit (`audit-estudiante-navegacion-2026-08.md`) — briefs propios.

## Criterio de cierre

- [x] `.xlsx` muestra ícono de Excel (verde), `.docx` muestra ícono de Word (azul), incluyendo archivos subidos por el propio estudiante.
- [x] `.pptx`/`.ppt` y `.pdf` verificados de paso (criterio original) — PDF ya estaba bien; PowerPoint no tenía color, se agregó.
- [x] `tsc --noEmit` sin errores.
- [x] Verificado en vivo (dev server FE `:4201` + BE `:5139`, login real vía switcher como estudiante ALCALA SANDOVAL DANIELA, curso `QA E2E Curso Prueba`) — confirmado por computed styles del DOM, no solo visual: `Libro1.xlsx` → clase `excel` (verde `rgb(34,197,94)`), `Este es solo un word de prueba.docx` (Mi Entrega) → clase `word` (azul `rgb(59,130,246)`), ya no `student-file`.

## Cierre (2026-08-12)

Commit `bdc3fee1` (`fix(cursos): correct file-type icon color for course attachments`) en `main` local de `educa-web`. 7 archivos, 30 inserciones / 17 eliminaciones. Servidores de dev (FE/BE) detenidos tras la verificación, sin procesos zombie (puertos 4201/5139 liberados).
