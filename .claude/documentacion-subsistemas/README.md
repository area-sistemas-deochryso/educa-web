# Documentación de Subsistemas

> Principios transferibles entre tecnologías. Cada documento describe **el qué y el por qué**, no el cómo específico de una librería.

Estos docs son **prescriptivos**: describen cómo debería funcionar cada subsistema, cuáles son sus invariantes, y qué anti-patrones evitar. Se usan para:

- Onboarding de desarrolladores nuevos al equipo
- Replicar el subsistema en otra tecnología (React, Vue, Next.js, etc.)
- Referencia en code reviews (`INV-WAL02`, `INV-CACHE05`, etc.)
- Auditorías de implementaciones existentes

---

## Subsistemas documentados

| Subsistema | Propósito | Documento |
|------------|-----------|-----------|
| **Trazabilidad de Errores** | Capturar, clasificar y persistir errores de producción con contexto del usuario | [trazabilidad-errores.md](trazabilidad-errores.md) |
| **Write-Ahead Log (WAL)** | Mutaciones con optimistic UI, resiliencia offline y rollback garantizado | [wal-write-ahead-log.md](wal-write-ahead-log.md) |
| **Cache Stale-While-Revalidate (SWR)** | Respuesta inmediata desde cache + revalidación en background + notificación de updates | [cache-swr.md](cache-swr.md) |
| **Service Worker Scope** | Cómo el scope define qué intercepta, a quién controla y cómo se actualiza el SW | [service-worker-scope.md](service-worker-scope.md) |
| **Autenticación, Sesión y Permisos** | Login/logout seguros, refresh transparente, coordinación multi-pestaña y autorización por rol + usuario | [auth-sesion-permisos.md](auth-sesion-permisos.md) |

---

## Cómo leer estos documentos

Cada subsistema sigue la misma estructura:

1. **Principio central**: la frase que resume el propósito del subsistema
2. **Principios numerados**: 10-16 principios transferibles, cada uno con reglas, ejemplos y razones
3. **Invariantes**: reglas con IDs estables (`INV-XX##`) para referencia en code reviews
4. **Anti-patrones**: errores comunes que anulan el propósito del subsistema
5. **Checklist de implementación**: pasos concretos para validar que el subsistema está completo
6. **Métricas de éxito**: cómo saber objetivamente que el subsistema funciona

---

## Relaciones entre subsistemas

```
┌─────────────────────────────────────────────────────────┐
│                  Service Worker Scope                   │
│               (define qué controla el SW)               │
│                            │                            │
│         ┌──────────────────┼──────────────────┐         │
│         ▼                                     ▼         │
│    Cache SWR                              WAL           │
│    (lecturas)                        (mutaciones)       │
│         │                                     │         │
│         │      ┌───────────────────┐          │         │
│         └─────▶│   Trazabilidad    │◀─────────┘         │
│                │    de Errores     │                    │
│                └───────────────────┘                    │
└─────────────────────────────────────────────────────────┘
```

- **Scope del SW**: determina qué URLs son interceptadas y qué pestañas controladas
- **Cache SWR**: sirve lecturas inmediatas desde cache, revalida en background
- **WAL**: persiste mutaciones localmente, aplica optimistic UI, sincroniza al servidor
- **Trazabilidad**: captura errores de todos los subsistemas (incluyendo fallos del SW o del WAL)

Los 4 se integran:

- El WAL notifica sus operaciones al tracker de breadcrumbs de la trazabilidad
- El cache notifica fallos de revalidación como errores NETWORK al sistema de trazabilidad
- El SW scope determina qué páginas pueden recibir mensajes de cache updates y revalidation failures
- La trazabilidad guarda errores en un outbox propio (mismo patrón que WAL, pero independiente)

---

## Cuándo crear un nuevo subsistema

Agregar un documento a esta carpeta cuando:

1. **Es transferible**: los principios aplican a cualquier stack, no son específicos de Angular/React/etc.
2. **Tiene invariantes no obvias**: reglas que, si se rompen, producen bugs sutiles difíciles de diagnosticar
3. **Se repite en proyectos**: si migraras a otra tecnología, querrías rediseñar esto
4. **Tiene anti-patrones conocidos**: hay formas incorrectas de implementarlo que son comunes

No crear documento para:

- Features específicas del producto (esos van en `.claude/rules/`)
- Convenciones del equipo (esos van en `.claude/rules/`)
- Cosas que ya están en la documentación oficial de la librería (linkearlas, no re-explicarlas)

---

## Mantenimiento

Estos docs deben actualizarse cuando:

- Se descubre una nueva invariante (agregar a la tabla con nuevo ID)
- Se identifica un anti-patrón nuevo (agregar a la tabla con solución)
- Cambia una regla fundamental (actualizar y marcar con fecha de cambio)
- Se retira un subsistema (mover a un archivo `retired/` con razón)

Los IDs de invariantes (`INV-XX##`) **nunca se reutilizan**. Si una invariante deja de aplicar, se marca como `DEPRECATED` pero no se elimina del documento.
