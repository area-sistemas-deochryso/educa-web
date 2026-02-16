# Optimización de Lectura de Archivos

## Principio fundamental

> **"Solo leer lo estrictamente necesario para completar la tarea actual. Necesidad sobre curiosidad."**

## Reglas de lectura

### ✅ CUÁNDO SÍ LEER

1. **Archivos que vas a modificar**
   - SIEMPRE leer antes de editar
   - Ejemplo: Si vas a editar `user.service.ts`, léelo primero

2. **Archivos directamente relacionados con error/bug**
   - Si el error menciona un archivo específico
   - Si el stack trace apunta a un archivo

3. **Archivos de configuración si son relevantes**
   - Solo si la tarea requiere cambios de configuración
   - Ejemplo: `tsconfig.json` para cambios de paths

4. **Archivos de contexto crítico**
   - Solo si la tarea es imposible sin ese contexto
   - Ejemplo: Modelo de datos para crear un formulario

### ❌ CUÁNDO NO LEER

1. **NO leer "para explorar"**
   - ❌ "Déjame ver cómo está estructurado el proyecto"
   - ❌ "Voy a revisar todos los componentes relacionados"
   - ❌ "Déjame ver qué hay en esta carpeta"

2. **NO leer "por si acaso"**
   - ❌ Leer múltiples archivos similares
   - ❌ Revisar implementaciones existentes sin motivo específico
   - ❌ Leer tests si no estás trabajando en tests

3. **NO leer archivos completos innecesariamente**
   - Si necesitas buscar algo, usa Grep/Glob primero
   - Solo lee después de confirmar que el archivo es relevante

4. **NO hacer lecturas especulativas en paralelo**
   - ❌ "Voy a leer estos 5 archivos para ver cuál tiene lo que necesito"
   - ✅ Usa Grep/Glob para buscar primero, lee después

## Estrategias de optimización

### 1. Usa búsqueda antes de lectura

```bash
# ✅ CORRECTO
1. grep para encontrar el archivo exacto que contiene X
2. Read solo ese archivo específico

# ❌ INCORRECTO
1. Read de 5 archivos "candidatos"
2. Revisar cuál tiene X
```

### 2. Confía en las convenciones del proyecto

```bash
# Si conoces la arquitectura, NO necesitas leer para saber:
# - Dónde va un servicio: @core/services/
# - Dónde va un componente: @features/*/components/
# - Dónde va un modelo: @data/models/

# ✅ CORRECTO: Crear archivo directamente
# ❌ INCORRECTO: Leer 3 archivos de ejemplo antes
```

### 3. Pregunta al usuario si no estás seguro

```bash
# ✅ CORRECTO
"¿El archivo X.service.ts ya existe o lo creo desde cero?"

# ❌ INCORRECTO
Leer 10 archivos para confirmar si existe
```

### 4. Usa Task/Explore agent solo cuando realmente necesitas explorar

```bash
# ✅ CORRECTO: Tareas exploratorias complejas
"Investiga cómo funciona el sistema de permisos"

# ❌ INCORRECTO: Tareas simples
"Encuentra el archivo user.service.ts" (usa Glob)
```

## Métricas de éxito

### Antes de cada operación de lectura, pregúntate:

1. **¿Es imposible completar la tarea sin leer esto?**
   - Si no → NO leas

2. **¿Voy a modificar este archivo?**
   - Si sí → Léelo
   - Si no → Probablemente no lo necesites

3. **¿Puedo inferir la estructura por las convenciones?**
   - Si sí → NO leas, confía en las convenciones

4. **¿Estoy leyendo por curiosidad o por necesidad?**
   - Curiosidad → NO leas
   - Necesidad → Léelo

## Ejemplos concretos

### Tarea: "Crea un nuevo servicio para manejar notificaciones"

```bash
# ❌ INCORRECTO (muchas lecturas)
1. Read notification.service.ts (para ver si existe)
2. Read auth.service.ts (para ver cómo se hace un servicio)
3. Read user.service.ts (otro ejemplo)
4. Read core/services/index.ts (para ver exports)
5. Crear servicio

Total: 4 lecturas innecesarias

# ✅ CORRECTO (lecturas mínimas)
1. Glob para buscar "notification.service.ts"
   (si no existe, crear directamente siguiendo convenciones)
2. Crear servicio siguiendo las reglas de @.claude/rules/

Total: 0-1 lecturas
```

### Tarea: "Arregla el error en user.component.ts línea 42"

```bash
# ❌ INCORRECTO
1. Read user.component.ts
2. Read user.service.ts (para ver contexto)
3. Read user.model.ts (para ver el tipo)
4. Read shared/components/... (para ver imports)
5. Arreglar error

Total: 4 lecturas innecesarias

# ✅ CORRECTO
1. Read user.component.ts (solo el archivo con error)
2. Si el error requiere ver un tipo específico, leer ese archivo
3. Arreglar error

Total: 1-2 lecturas
```

### Tarea: "Agrega validación al formulario de usuarios"

```bash
# ❌ INCORRECTO
1. Read todos los validators existentes
2. Read documentación de Angular forms
3. Read user.component.ts
4. Implementar

# ✅ CORRECTO
1. Read user.component.ts (solo el archivo a modificar)
2. Implementar siguiendo reglas de validación en @.claude/rules/

Total: 1 lectura
```

## Regla de oro

> **"Si puedes completar la tarea sin leer el archivo, no lo leas."**

## Verificación

Antes de usar Read, responde:

- [ ] ¿Voy a editar este archivo? (entonces sí)
- [ ] ¿Este archivo contiene el error específico? (entonces sí)
- [ ] ¿Es imposible sin este contexto? (entonces sí)
- [ ] ¿Es solo curiosidad? (entonces NO)
- [ ] ¿Puedo inferirlo por convenciones? (entonces NO)

## Excepción

La ÚNICA excepción es cuando el usuario explícitamente pide:
- "Investiga cómo..."
- "Explora el código de..."
- "Revisa todos los archivos de..."

En esos casos, usar Task/Explore agent apropiadamente.
