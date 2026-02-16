# Quality Gate — Control de Calidad Pre-Push

## Objetivo

> **"Funciona es condición necesaria, no suficiente."**

Toda PR o push generado con asistencia de IA debe cumplir invariantes de calidad verificables. Esta regla reduce retrabajo, bugs por mal diseño y dependencia de "prompt mago".

---

## 1. Contrato de Salida (4 Invariantes Binarios)

Cada cambio DEBE cumplir los 4. Si falla uno, no se pushea.

### Legibilidad (SI / NO)

- Nombres de variables, funciones y archivos expresan intención
- Flujo de ejecución es obvio sin necesidad de comentarios explicativos
- No hay abreviaciones crípticas ni nombres genéricos (`data`, `info`, `temp`, `result`)

### Modularidad (SI / NO)

- Cada pieza tiene una sola responsabilidad clara
- Límites entre piezas son explícitos (inputs/outputs definidos)
- No hay mega-funciones ni god components

### Testabilidad (SI / NO)

- Puntos de inyección claros (dependencias via `inject()`, no hardcoded)
- Funciones puras donde aplique (helpers, utils, computed)
- Mocks fáciles: no se necesita montar medio sistema para testear una pieza

### Evolutividad (SI / NO)

- Añadir una variante nueva NO requiere modificar código existente que funciona
- Se sigue Open/Closed: extender sin modificar
- Los puntos de extensión son claros (interfaces, inputs, configuración)

---

## 2. SOLID y Open/Closed como Default

### Principio rector

> **"No modificar funcionalidad existente sin consulta previa."**

Antes de modificar un archivo que ya funciona correctamente, verificar:

| Pregunta | Si la respuesta es SÍ |
|----------|-----------------------|
| ¿Puedo resolver esto creando algo nuevo en vez de modificar lo existente? | Crear nuevo |
| ¿El cambio altera comportamiento que otros consumen? | Consultar al usuario antes |
| ¿Estoy tocando un archivo solo para "mejorar" algo que no me pidieron? | No tocarlo |

### Aplicación práctica

```typescript
// ❌ INCORRECTO - Modificar servicio existente para caso nuevo
@Injectable({ providedIn: 'root' })
export class NotificacionService {
  enviar(tipo: string, data: any): void {
    if (tipo === 'push') { /* ... */ }
    if (tipo === 'email') { /* ... */ }
    if (tipo === 'whatsapp') { /* ... */ }  // ❌ Cada tipo nuevo modifica este método
  }
}

// ✅ CORRECTO - Extender sin modificar
interface NotificacionChannel {
  enviar(data: NotificacionData): Observable<void>;
}

@Injectable({ providedIn: 'root' })
export class PushChannel implements NotificacionChannel { /* ... */ }

@Injectable({ providedIn: 'root' })
export class EmailChannel implements NotificacionChannel { /* ... */ }

// Agregar WhatsApp = crear clase nueva, no tocar las existentes
@Injectable({ providedIn: 'root' })
export class WhatsAppChannel implements NotificacionChannel { /* ... */ }
```

### Cuándo SÍ es válido modificar

- Bug fix en el código existente
- El usuario pidió explícitamente refactorizar
- El cambio es puramente aditivo (agregar un campo opcional, un nuevo método)
- Renaming/cleanup que el usuario solicitó

---

## 3. Límites de Tamaño (Frontend)

### Funciones y métodos

| Líneas | Estado | Acción |
|--------|--------|--------|
| ≤ 30 | OK | Mantener |
| 31–50 | Warning | Evaluar si se puede extraer |
| > 50 | Bloqueo | Obligatorio dividir antes de entregar |

**Cómo dividir una función larga:**

```typescript
// ❌ INCORRECTO - Función de 80 líneas
saveUsuario(): void {
  // validar (15 líneas)
  // preparar datos (20 líneas)
  // llamar API (10 líneas)
  // actualizar store (15 líneas)
  // mostrar feedback (10 líneas)
  // limpiar formulario (10 líneas)
}

// ✅ CORRECTO - Funciones pequeñas con intención clara
saveUsuario(): void {
  if (!this.validateForm()) return;

  const payload = this.preparePayload();
  this.store.setLoading(true);

  this.api.save(payload).subscribe({
    next: (response) => this.handleSaveSuccess(response),
    error: (err) => this.handleSaveError(err),
  });
}

private validateForm(): boolean { /* 10 líneas */ }
private preparePayload(): SavePayload { /* 10 líneas */ }
private handleSaveSuccess(response: SaveResponse): void { /* 10 líneas */ }
private handleSaveError(err: unknown): void { /* 8 líneas */ }
```

### Archivos

| Líneas | Estado | Acción |
|--------|--------|--------|
| ≤ 200 | OK | Mantener |
| 201–350 | Aceptable | Revisar si hay responsabilidades mezcladas |
| > 350 | Warning | Evaluar split (extraer sub-componente, helper, etc.) |
| > 500 | Bloqueo | Obligatorio dividir |

**Excepciones**: Stores y facades con muchos campos pueden superar 200 líneas si cada sección está en su region y tiene una sola responsabilidad.

### Templates HTML

| Líneas | Estado | Acción |
|--------|--------|--------|
| ≤ 150 | OK | Mantener |
| 151–250 | Aceptable | Evaluar extraer sub-componentes |
| > 250 | Warning | Extraer secciones a sub-componentes presentacionales |

---

## 4. Recordatorio Pre-Push para el Usuario

**IMPORTANTE**: Al completar un conjunto de cambios significativo (feature nuevo, refactor, fix complejo), recordar al usuario las siguientes preguntas de auto-evaluación antes del push:

```
Antes de pushear, responde estas preguntas (2-3 min):

1. ¿Dónde vive el estado y por qué ahí?
2. ¿Qué cambia si mañana agrego 3 variantes del mismo caso?
3. ¿El "hotspot" de cambios frecuentes está aislado?
4. ¿Hay acoplamientos implícitos? (nombres mágicos, rutas hardcodeadas, singletons ocultos)
5. ¿Hay puntos de extensión claros?
6. ¿Qué parte es difícil de testear y por qué?

Si no puedes responder en 2-3 minutos → el diseño no está claro.
```

---

## 5. Enforcement por Claude

### Lo que Claude DEBE hacer automáticamente

| Verificación | Acción |
|-------------|--------|
| Función > 50 líneas | Dividir antes de entregar |
| Archivo > 500 líneas (frontend) | Proponer split y consultar |
| Modificar archivo existente sin que se pidió | No hacerlo; si es necesario, consultar |
| God component (estado + HTTP + lógica + UI) | Rechazar y proponer Facade + Store |
| Signal público mutable en store/service | Corregir a privado + asReadonly |
| Lógica de negocio en componente | Mover a facade/service |

### Lo que Claude DEBE preguntar antes de hacer

| Situación | Pregunta |
|-----------|----------|
| Cambio afecta comportamiento existente | "Este cambio modifica X que ya funciona. ¿Procedo o prefieres otro approach?" |
| Refactor no solicitado | "Detecto que Y podría mejorarse. ¿Quieres que lo incluya o lo dejo para después?" |
| Archivo necesita crecer > 350 líneas | "Este archivo va a superar 350 líneas. ¿Prefieres que extraiga Z a un archivo separado?" |

---

## Checklist Rápido (binario)

Antes de entregar cualquier cambio:

```
CONTRATO DE SALIDA
[ ] Legibilidad: ¿Nombres claros, flujo obvio?
[ ] Modularidad: ¿Piezas pequeñas, 1 responsabilidad cada una?
[ ] Testabilidad: ¿Inyección clara, funciones puras donde aplique?
[ ] Evolutividad: ¿Extensible sin modificar lo existente?

TAMAÑO
[ ] ¿Ninguna función supera 50 líneas?
[ ] ¿Ningún archivo supera 500 líneas?
[ ] ¿Ningún template supera 250 líneas?

SOLID
[ ] ¿No se modificó funcionalidad existente sin necesidad?
[ ] ¿Los cambios son aditivos donde fue posible?
[ ] ¿Se consultó antes de alterar comportamiento existente?
```
