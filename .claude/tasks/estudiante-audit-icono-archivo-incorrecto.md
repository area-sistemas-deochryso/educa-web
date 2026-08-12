<!-- created: 2026-08-11 -->

# estudiante-audit-icono-archivo-incorrecto ✅ Resuelto

> **Origen**: F1 audit funcional del plan [`audit-estudiante-navegacion-2026-08.md`](../plan/audit-estudiante-navegacion-2026-08.md).
> **Severidad**: 🟢 (cosmético, no bloquea nada, pero es fácil de arreglar).
> **Resuelto**: commit `bdc3fee1` (2026-08-12), brief [`chats/closed/550-fe-icono-archivo-tipo-color.md`](../chats/closed/550-fe-icono-archivo-tipo-color.md). Dos causas: (1) el MIME `officedocument` de Excel/PowerPoint contiene la substring `"document"`, así que el check de Word matcheaba antes que el de Excel/PowerPoint; (2) la clase CSS `.row-icon.student-file` forzaba verde en cualquier archivo subido por el propio estudiante, sin importar su tipo. Verificado en vivo con login real como estudiante — `.xlsx` en verde, `.docx` en azul, incluyendo la propia entrega del estudiante.

## Reproducción

1. Loguear como estudiante, ir a `/intranet/estudiante/cursos` ("Mis Cursos").
2. Abrir el curso `QA E2E Curso Prueba` → tab "Contenido" → expandir "Semana 1".
3. Ver el archivo adjunto `Libro1.xlsx` (10.1 KB) bajo "ARCHIVOS".

**Actual**: el ícono mostrado es el de Word (cuadrado azul con "W"), pese a que la extensión es `.xlsx` (Excel). Contraste: la entrega propia del estudiante en la misma vista ("Este es solo un word de prueba.docx") sí muestra el ícono correcto de Word en verde — o sea, el mapeo funciona para `.docx` pero falla para `.xlsx`.

**Esperado**: `.xlsx` muestra ícono de Excel (verde, "X"), igual que ya lo hace correctamente para `.docx`.

## Componente probable

Utilidad/pipe compartido de ícono-por-extensión usado en el listado de archivos de curso (módulo "Archivos", embebido en `estudiante/cursos` y `profesor/cursos` según el inventario de `intranet-fe-polish-W21.md` — no tiene página propia). Buscar por el mapeo de extensiones (`docx`, `xlsx`, `pdf`, etc.) — probablemente un `switch`/diccionario con un caso faltante o mal mapeado para `xls`/`xlsx`.

## Perspectiva de rol

Impacto bajo directamente sobre el estudiante (la mayoría de los chicos no distingue iconografía de tipo de archivo), pero sí afecta la percepción de calidad/cuidado de la plataforma para el adulto que la usa junto al chico o la revisa.

## Criterio de cierre

- `.xlsx` y `.xls` muestran ícono de Excel.
- Verificar de paso `.pptx`/`.ppt` (PowerPoint) y `.pdf` por si comparten el mismo mapeo con huecos similares — no vistos en esta sesión pero mismo patrón de riesgo.

## Out-of-scope

- Preview inline de archivos (sigue siendo descarga/apertura externa).
