# Comandos de Voz - Intranet EducaWeb

Este documento lista todos los comandos de voz disponibles en la intranet de EducaWeb.

## Requisitos

- Navegador compatible con Web Speech API (Chrome, Edge, Safari)
- Conexión HTTPS (requerido por la API de reconocimiento de voz)
- Permiso de micrófono habilitado

## Uso del Micrófono

| Acción | Descripción |
|--------|-------------|
| **Mantener presionado** | Activa el micrófono mientras se mantiene presionado |
| **Deslizar hacia arriba** | Bloquea el micrófono para grabación continua |
| **Ctrl + Espacio** | Mostrar/ocultar el botón de micrófono |

---

## Comandos de Navegación entre Páginas

| Comando | Descripción |
|---------|-------------|
| "ir a inicio" / "ve a inicio" / "inicio" | Navega a la página principal de la intranet |
| "ir a asistencia" / "ve a asistencia" / "asistencia" | Navega a la página de asistencias |
| "ir a horario" / "ir a horarios" / "ve a horarios" / "horarios" / "horario" | Navega a la página de horarios |
| "ir a calendario" / "ve a calendario" / "calendario" | Navega a la página del calendario |

---

## Comandos de Scroll (Navegación en Página)

| Comando | Descripción |
|---------|-------------|
| "baja" / "bajar" / "abajo" / "scroll abajo" | Baja 300px en la página |
| "sube" / "subir" / "arriba" / "scroll arriba" | Sube 300px en la página |
| "izquierda" / "scroll izquierda" | Mueve el scroll hacia la izquierda |
| "derecha" / "scroll derecha" | Mueve el scroll hacia la derecha |
| "al inicio" / "ir al inicio" / "principio" | Va al inicio de la página |
| "al final" / "ir al final" / "fin" | Va al final de la página |

---

## Comandos de Paginación (Tablas)

| Comando | Descripción |
|---------|-------------|
| "siguiente página" / "página siguiente" / "siguiente" | Ir a la siguiente página de la tabla |
| "página anterior" / "anterior" | Ir a la página anterior de la tabla |
| "página [número]" / "ir a página [número]" | Ir a una página específica (ej: "página 3") |

---

## Comandos de Fecha (Página de Asistencia)

### Cambiar Mes

| Comando | Descripción |
|---------|-------------|
| "enero" / "ir a enero" | Cambia al mes de enero |
| "febrero" / "ir a febrero" | Cambia al mes de febrero |
| "marzo" / "ir a marzo" | Cambia al mes de marzo |
| "abril" / "ir a abril" | Cambia al mes de abril |
| "mayo" / "ir a mayo" | Cambia al mes de mayo |
| "junio" / "ir a junio" | Cambia al mes de junio |
| "julio" / "ir a julio" | Cambia al mes de julio |
| "agosto" / "ir a agosto" | Cambia al mes de agosto |
| "septiembre" / "setiembre" / "ir a septiembre" | Cambia al mes de septiembre |
| "octubre" / "ir a octubre" | Cambia al mes de octubre |
| "noviembre" / "ir a noviembre" | Cambia al mes de noviembre |
| "diciembre" / "ir a diciembre" | Cambia al mes de diciembre |

### Cambiar Año

| Comando | Descripción |
|---------|-------------|
| "[año]" / "ir a [año]" / "año [año]" | Cambia al año especificado (ej: "2024", "ir a 2025") |

---

## Comandos de Modales

### Comandos Generales

| Comando | Descripción |
|---------|-------------|
| "abrir [nombre]" | Abre el modal especificado |
| "cerrar [nombre]" | Cierra el modal especificado |
| "cerrar" / "cerrar modal" / "cerrar ventana" | Cierra el modal activo |

### Modales Disponibles (Página de Horarios)

| Modal | Nombres/Aliases |
|-------|-----------------|
| **Horario** | "horario", "horarios", "mi horario", "el horario", "schedule" |
| **Resumen** | "resumen", "resumen académico", "el resumen", "summary", "resumen de cursos" |
| **Notas** | "notas", "calificaciones", "mis notas", "las notas", "grades" |
| **Detalles** | "detalles", "detalles del curso", "detalle", "información del curso" |

**Ejemplos:**
- "abrir horario" → Abre el modal de horario
- "cerrar resumen" → Cierra el modal de resumen
- "abrir notas" → Abre el modal de notas (requiere tener un curso seleccionado)
- "abrir calificaciones" → También abre el modal de notas

---

## Comandos de Control

| Comando | Descripción |
|---------|-------------|
| "borrar" / "limpiar" / "borrar texto" | Borra el texto dictado en el campo activo |

---

## Notas Importantes

1. **Sensibilidad**: Los comandos no distinguen entre mayúsculas y minúsculas.

2. **Idioma**: El reconocimiento de voz está configurado en español (es-PE).

3. **Texto libre**: Si lo que dices no coincide con ningún comando, el texto se agregará al campo de entrada activo (si hay uno).

4. **Feedback visual**: Cuando se reconoce un comando, aparece una notificación verde indicando la acción ejecutada.

5. **Errores comunes**:
   - **Error de red**: Asegúrate de usar HTTPS y tener conexión a internet.
   - **Permiso denegado**: Habilita el permiso de micrófono en la configuración del navegador.

---

## Atajos de Teclado

| Atajo | Descripción |
|-------|-------------|
| **Ctrl + Espacio** | Mostrar/ocultar el botón de micrófono |
