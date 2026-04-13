# Subsistema: Write-Ahead Log (WAL) para Mutaciones

> Principios transferibles entre tecnologías para construir un sistema de mutaciones con optimistic UI, resiliencia offline y rollback garantizado.

---

## Principio central

> **"El usuario debe sentir que sus acciones son instantáneas. El sistema debe garantizar que ninguna acción se pierde."**

Cuando un usuario guarda algo, la UI responde **antes** de que el servidor confirme. Pero la operación debe sobrevivir crashes, recargas, desconexiones y errores. El WAL hace ambas cosas posibles.

---

## 1. Optimistic UI primero

El usuario no debe esperar al servidor. La UI aplica el cambio inmediatamente como si ya hubiera sido aceptado.

### Reglas

- Al ejecutar una mutación, aplicar el cambio en el estado local **primero**
- Luego enviar al servidor en background
- El usuario ve el resultado en <16ms (un frame), no en 300-1000ms (un round trip)
- Si el servidor falla, revertir al estado anterior (rollback)

### Por qué

La percepción de velocidad es más importante que la velocidad real. Una app que responde al instante se siente sólida aunque el servidor tarde.

---

## 2. Persistir la intención antes de ejecutar

Entre el momento que el usuario hace click y el momento que el servidor confirma, pueden pasar muchas cosas: crash del browser, pérdida de red, cierre de pestaña. Si no persistes la intención, se pierde.

### Reglas

- Antes de enviar al servidor, escribir la operación en un log local (IndexedDB, SQLite, archivo)
- El log incluye: tipo (CREATE/UPDATE/DELETE), recurso, payload, timestamp
- La operación queda marcada como `PENDING` hasta que el servidor confirme
- Al arrancar la app, leer el log y procesar lo que quedó pendiente

### Por qué

Sin log local, si la app se cierra entre el optimistic update y la confirmación del servidor, el usuario ve el cambio en pantalla pero el servidor no lo tiene. Al recargar, el cambio desaparece sin aviso.

---

## 3. Separar intención de ejecución

El código que **decide** qué mutación hacer no es el mismo que **ejecuta** la mutación. El usuario dispara la intención; el engine la ejecuta en su propio tiempo.

### Reglas

- La facade/store solo dice "quiero crear X con estos datos"
- El engine se encarga de: persistir en log, enviar al servidor, reintentar, notificar resultado
- La facade recibe callbacks: `onCommit` (éxito), `onError` (fallo), `rollback` (reversión)
- El engine es **stateful** — mantiene la cola de operaciones pendientes

### Por qué

Separar intención de ejecución permite reintentos, colas, serialización, offline, y cambios de estrategia (todo sin tocar el código de negocio).

---

## 4. Rollback garantizado

Si el servidor rechaza la operación, la UI debe volver al estado anterior sin dejar rastro.

### Reglas

- Al aplicar el optimistic update, guardar un **snapshot** del estado previo
- Si `onError` se dispara, ejecutar `rollback()` con el snapshot
- El rollback es una función que restaura el estado exacto (no "recalcular de nuevo")
- El usuario ve un toast de error claro explicando qué pasó

### Anti-patrón

Confiar en que "refetch y listo" reemplaza al rollback. El refetch puede fallar, puede tardar, puede traer datos diferentes. El rollback debe ser determinista.

---

## 5. Niveles de consistencia

No todas las operaciones tienen las mismas garantías. Distinguir entre:

| Nivel | Qué hace | Cuándo usar |
|-------|----------|-------------|
| **Optimistic** | UI cambia inmediato, enviar en background, rollback en error | CRUD normal (editar nombre, toggle activo) |
| **Optimistic-confirm** | UI cambia inmediato, pero esperar confirmación del servidor para seguir | Operaciones dependientes (después de guardar, navegar) |
| **Server-confirmed** | Esperar al servidor **antes** de cambiar la UI | Operaciones críticas (procesar pago, aprobar documento) |
| **Serialized** | Server-confirmed + ejecutar una a la vez | Operaciones que no pueden ser concurrentes (contador, secuencia) |

### Regla

El default es `optimistic`. Subir el nivel de consistencia solo cuando el negocio lo requiere. Cada nivel extra cuesta latencia percibida.

---

## 6. Resiliencia offline

Si el usuario está sin red, la operación se persiste y se envía cuando vuelve la conexión.

### Reglas

- Las operaciones en el log sobreviven a: refresh de página, cierre del browser, reinicio del sistema
- Al detectar conexión restaurada, el engine drena el log (envía lo pendiente)
- El usuario no se entera de que estaba offline — solo ve que las acciones funcionaron
- Si el servidor rechaza al reintentar (por ejemplo, conflicto), aplicar rollback y notificar

### Límite

El log tiene un tamaño máximo. Si se llena (usuario muchas horas offline), el engine puede:
- Rechazar nuevas operaciones hasta drenar
- Descartar las más antiguas (con aviso al usuario)
- Preferible: evitar que llegue al límite con compactación o bloqueo explícito

---

## 7. Reconciliación post-recarga

Si la app se recarga mientras hay operaciones pendientes, los callbacks en memoria se pierden. El engine debe reconciliar.

### Reglas

- Al iniciar la app, buscar entradas del log con callbacks huérfanos
- Cuando una operación se completa sin callback, emitir un evento global: "entrada X de tipo Y fue committed"
- Las facades suscritas al evento pueden decidir: refetch, mutación quirúrgica, o ignorar
- La UI se actualiza sin que el usuario note la diferencia

### Por qué

Sin reconciliación, el usuario guarda algo, recarga, y ve el estado viejo porque el callback `onCommit` nunca corrió. La data **sí** se guardó, pero la UI no lo sabe.

---

## 8. Fallback graceful

Si el storage local no está disponible (QuotaExceeded, modo privado del browser, bug del engine), la mutación no debe fallar.

### Reglas

- Capturar errores al escribir en el log
- Si el log falla, ejecutar la operación **directamente** (sin WAL, sin optimistic)
- Avisar al usuario que hay un problema ("almacenamiento lleno, enviando directamente")
- Loggear el fallo para diagnóstico

### Por qué

Un usuario con browser en modo privado o con storage lleno no puede quedar bloqueado. Mejor degradación que fallo total.

---

## 9. Deduplicación por recurso

Si el usuario hace clicks rápidos en el mismo botón (double-click, impaciencia), el engine debe manejar los duplicados.

### Reglas

- El engine serializa operaciones sobre el **mismo recurso** (UPDATE producto #5)
- Operaciones sobre **recursos diferentes** pueden correr en paralelo
- Los reintentos usan **idempotency keys** (UUID) para que el servidor deduplique
- El servidor rechaza operaciones duplicadas con 409 Conflict (o acepta sin efecto)

---

## 10. Observabilidad del estado del WAL

El usuario debe poder saber si hay operaciones pendientes (especialmente offline).

### Reglas

- Un store/signal con el conteo de entradas `PENDING`
- Un indicador en la UI ("Sincronizando 3 cambios...")
- Visible pero discreto (corner notification, no modal)
- Se oculta cuando todo está sincronizado

### Por qué

Sin feedback, el usuario no sabe si sus cambios están a salvo o si hay un problema en curso.

---

## 11. Invariantes del sistema

| ID | Invariante |
|----|-----------|
| `INV-WAL01` | Ninguna operación optimistic se pierde ante crash o recarga |
| `INV-WAL02` | El rollback siempre deja el estado exacto previo al optimistic update |
| `INV-WAL03` | Operaciones sobre el mismo recurso se ejecutan en orden (serializadas) |
| `INV-WAL04` | Si el log local falla, la operación se ejecuta directa (no bloquea) |
| `INV-WAL05` | Los reintentos son idempotentes (usan idempotency key) |
| `INV-WAL06` | La UI siempre refleja el estado real del log (no hay divergencia silenciosa) |

---

## Anti-patrones

| Anti-patrón | Por qué es malo | Solución |
|-------------|-----------------|----------|
| Enviar al servidor y esperar antes de cambiar UI | Latencia percibida alta, mala UX | Optimistic update + rollback |
| Optimistic sin snapshot del estado anterior | Rollback imposible, estados corruptos | Guardar snapshot antes de aplicar |
| Mezclar lógica de WAL en facades/stores | Código acoplado, imposible cambiar estrategia | Engine separado con callbacks |
| Confiar en refetch como rollback | Refetch puede fallar o traer datos diferentes | Rollback determinista desde snapshot |
| Enviar duplicados al servidor | Datos duplicados, contadores incorrectos | Idempotency keys + serialización por recurso |
| Sin reconciliación post-reload | Callbacks huérfanos, UI desactualizada | Evento global + suscripción en facades |
| Sin límite de tamaño del log | Storage lleno, app bloqueada | Límite + estrategia de compactación |

---

## Checklist de implementación

```
ENGINE
[ ] Log persistente (IndexedDB / SQLite / archivo)
[ ] Operaciones con tipo, recurso, payload, timestamp, estado
[ ] Estados: PENDING, IN_FLIGHT, COMMITTED, FAILED
[ ] Callbacks registrados por sesión (onCommit, onError, rollback)

EJECUCIÓN
[ ] Apply optimistic update
[ ] Save snapshot para rollback
[ ] Persistir en log antes de enviar
[ ] Enviar con idempotency key
[ ] Retry con backoff exponencial en errores transientes

CONSISTENCIA
[ ] Nivel configurable por operación
[ ] Serialización por recurso (mismo ID = cola)
[ ] Paralelismo entre recursos distintos

OFFLINE
[ ] Detectar cambios de conectividad
[ ] Drenar el log al recuperar conexión
[ ] Límite de tamaño del log

RECONCILIACIÓN
[ ] Evento global al committear sin callback
[ ] Facades suscritas deciden: refetch / mutación / nada

FALLBACK
[ ] Manejar QuotaExceeded del storage
[ ] Ejecutar directo si el log no está disponible
[ ] Notificar al usuario en caso de degradación

OBSERVABILIDAD
[ ] Store reactivo con estado del log
[ ] Indicador visual de "sincronizando"
[ ] Métricas: operaciones pendientes, tasa de error
```

---

## Métricas de éxito

1. **Latencia percibida <50ms** — el usuario nunca siente que esperó al servidor
2. **0% de operaciones perdidas** ante crashes, recargas, o pérdida de red
3. **Rollback exitoso en 100% de los errores** — sin estados corruptos
4. **Drain automático al volver online** — sin intervención del usuario
5. **Operaciones offline completadas** al reconectar, incluso después de cerrar el browser
