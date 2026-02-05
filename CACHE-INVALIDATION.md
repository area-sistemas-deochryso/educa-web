# Sistema Automático de Invalidación de Cache

## 🎯 Objetivo

Prevenir errores de deserialización cuando el backend cambia la estructura de datos **sin intervención manual del desarrollador**.

## ❌ Problema que resuelve

Cuando el backend modifica DTOs (agregar/quitar campos, cambiar tipos), el cache offline guarda datos con la estructura antigua. El frontend intenta deserializar datos incompatibles → **error la primera vez** → segunda vez funciona porque el cache se actualizó.

**Antes:**
```
1. Backend cambia DTO de asistencias
2. Frontend cachea estructura antigua
3. Usuario recarga app
4. ERROR: Cannot read property 'X' of undefined  ❌
5. Usuario recarga de nuevo
6. Ahora funciona (cache actualizado)  ✅
```

## ✅ Solución

Sistema automático que:
1. Detecta cuando cambió la versión de un módulo
2. Invalida automáticamente el cache de ese módulo
3. Usuario nunca ve errores

**Ahora:**
```
1. Backend cambia DTO de asistencias
2. Desarrollador cambia versión en config: v1 → v2
3. Usuario recarga app
4. Sistema detecta cambio automáticamente
5. Cache invalidado antes de usarlo
6. Funciona la primera vez  ✅
```

---

## 📝 Guía de uso (para desarrolladores)

### 1. Cuando haces cambios breaking en el backend

Abre el archivo de configuración:

**`src/app/config/cache-versions.config.ts`**

```typescript
export const CACHE_VERSIONS = {
  asistencias: '2024-02-05-v1',  // ← CAMBIAR ESTO
  usuarios: '2024-01-15-v1',
  salones: '2024-01-15-v1',
  cursos: '2024-01-15-v1',
  reportes: '2024-01-15-v1',
  sistema: '2024-01-15-v1',
};
```

### 2. Incrementa la versión del módulo afectado

```typescript
export const CACHE_VERSIONS = {
  asistencias: '2024-02-05-v2',  // ✅ Cambió de v1 a v2
  usuarios: '2024-01-15-v1',
  // ... resto igual
};
```

### 3. ¡Eso es todo!

**No necesitas:**
- ❌ Llamar métodos manualmente
- ❌ Crear guards
- ❌ Agregar código en componentes
- ❌ Preocuparte por invalidar cache

El sistema lo hace **automáticamente** al iniciar la app.

---

## 🔄 ¿Cuándo cambiar la versión?

### ✅ SÍ cambiar (breaking changes)

| Cambio | Ejemplo | Acción |
|--------|---------|--------|
| Agregar campo obligatorio | `{ nombre }` → `{ nombre, apellido }` | Incrementar versión |
| Quitar campo | `{ nombre, edad }` → `{ nombre }` | Incrementar versión |
| Renombrar campo | `EST_DNI` → `estudiante_dni` | Incrementar versión |
| Cambiar tipo | `edad: string` → `edad: number` | Incrementar versión |
| Cambiar códigos | `"A"` / `"T"` → `"AT_TIEMPO"` / `"TARDE"` | Incrementar versión |

### ❌ NO cambiar (non-breaking)

| Cambio | Ejemplo | Acción |
|--------|---------|--------|
| Agregar campo opcional al final | `{ nombre }` → `{ nombre, edad?: number }` | No cambiar |
| Cambios solo backend (no afectan JSON) | Optimización de SQL | No cambiar |
| Agregar endpoint nuevo | `/api/usuarios/nuevo` | No cambiar |

---

## 📋 Formato de versión recomendado

```
YYYY-MM-DD-vN
```

**Ejemplos:**
- `2024-02-05-v1` - Primera versión del 5 de febrero
- `2024-02-05-v2` - Segunda versión del mismo día
- `2024-02-10-v1` - Nueva versión del 10 de febrero

**Alternativas válidas:**
- Git commit hash: `a3f2c1b`
- Timestamp: `1707145200`
- Cualquier string único

---

## 🔍 Cómo funciona internamente

### Al iniciar la app:

```
1. AppComponent se inicializa automáticamente
2. CacheVersionManagerService se ejecuta
3. Compara versiones en config vs localStorage:

   Config:              localStorage:
   asistencias: v2      asistencias: v1  ← ¡DIFERENTE!
   usuarios: v1         usuarios: v1     ← Igual
   salones: v1          salones: v1      ← Igual

4. Detecta que asistencias cambió
5. Invalida automáticamente /api/ConsultaAsistencia/*
6. Guarda nueva versión en localStorage
7. Usuario recibe datos frescos sin errores
```

### Logging automático:

```
[CacheVersionManager] Iniciando verificación de versiones...
[CacheVersionManager] Módulo "asistencias" cambió: v1 → v2
[SW] Cache invalidado: 5 entradas con patrón "/api/ConsultaAsistencia"
[CacheVersionManager] ✅ Cache invalidado automáticamente:
  - Módulos: asistencias
  - Total entradas eliminadas: 5
```

---

## 🛠️ Debug y troubleshooting

### Ver estado actual de versiones

En la consola del navegador:

```javascript
inject(CacheVersionManagerService).showVersionStatus();
```

Output:
```
┌──────────────┬─────────────────┬─────────────────┐
│   Module     │    Current      │     Stored      │
├──────────────┼─────────────────┼─────────────────┤
│ asistencias  │ 2024-02-05-v2   │ 2024-02-05-v1   │
│ usuarios     │ 2024-01-15-v1   │ 2024-01-15-v1   │
└──────────────┴─────────────────┴─────────────────┘
```

### Forzar re-verificación completa

En la consola del navegador:

```javascript
inject(CacheVersionManagerService).resetVersions();
location.reload();
```

Esto eliminará todas las versiones guardadas y forzará una nueva comparación.

---

## 🎓 Ejemplos de casos reales

### Caso 1: Cambios en asistencias (como el actual)

**Cambio backend:**
- Moviste cálculo de estado de frontend a backend
- DTOs ahora incluyen `estadoCodigo` en lugar de calcularlo en el frontend

**Acción:**
```typescript
// cache-versions.config.ts
asistencias: '2024-02-05-v2',  // ← Cambiar de v1 a v2
```

**Resultado:**
```
Usuario recarga app
→ Sistema detecta v1 → v2
→ Invalida /api/ConsultaAsistencia/*
→ Próximas peticiones traen estructura nueva
→ Sin errores ✅
```

### Caso 2: Cambios en usuarios

**Cambio backend:**
- Agregaste campo obligatorio `telefono` al DTO de usuarios
- Frontend ahora espera `usuario.telefono`

**Acción:**
```typescript
// cache-versions.config.ts
usuarios: '2024-02-10-v2',  // ← Cambiar de v1 a v2
```

### Caso 3: Deploy con múltiples módulos

**Cambio backend:**
- Refactorizaste asistencias, usuarios y reportes
- Todos tienen nuevos DTOs

**Acción:**
```typescript
// cache-versions.config.ts
asistencias: '2024-02-15-v2',  // ✅
usuarios: '2024-02-15-v2',     // ✅
reportes: '2024-02-15-v2',     // ✅
```

**Resultado:**
```
[CacheVersionManager] ✅ Cache invalidado automáticamente:
  - Módulos: asistencias, usuarios, reportes
  - Total entradas eliminadas: 37
```

---

## 📊 Ventajas vs sistema manual

| Manual | Automático |
|--------|------------|
| ❌ Olvidar invalidar → errores en producción | ✅ Imposible olvidar |
| ❌ Código disperso en guards/components | ✅ Todo centralizado en 1 archivo |
| ❌ Cada dev implementa diferente | ✅ Patrón consistente |
| ❌ Difícil de mantener | ✅ Fácil de mantener |
| ❌ Propenso a errores humanos | ✅ A prueba de errores |

---

## 🚀 TL;DR (demasiado largo; no leí)

**Para desarrolladores:**
1. Hiciste cambios breaking en el backend?
2. Abre `src/app/config/cache-versions.config.ts`
3. Cambia `v1` → `v2` en el módulo afectado
4. Commit y deploy
5. Listo! El sistema invalida automáticamente el cache

**Para usuarios:**
- Nada cambia
- La app funciona sin errores
- No necesitan hacer nada especial
