# 379 — FE: error NG02100 en defer-events + logger custom trunca mensaje

> **Repo**: `educa-web`
> **Creado**: 2026-07-07 · **Estado**: ⏳ pendiente arrancar.
> **MODO SUGERIDO**: `/investigate`

## Contexto

En producción, al navegar a `/intranet/admin/monitoreo/correos/defer-events`, se disparó
un error CRITICAL capturado por el logger custom de frontend:

- **Cadena de llamadas**: `transform`
- **Mensaje**: `NG02100` (solo el código, sin el resto del mensaje de Angular)
- **Usuario**: Administrador (***5896)
- **Timestamp**: 2026-07-07 07:52:10

### Stack trace (cliente, minificado)

```
Error: NG02100
    at Z (chunk-M76WNDB3.js:1:24815)
    at e.transform (chunk-M76WNDB3.js:1:26000)
    at Xm (chunk-VES2YQV6.js:4:140854)
    at $w (chunk-VES2YQV6.js:4:141627)
    ...
```

### Flujo previo (breadcrumbs)

El usuario navegó: `bandeja` → `dashboard` → `diagnostico` → `auditoria` → `blacklist` →
`quarantine` → `domain-pauses` → `defer-events`. En `defer-events` se dispararon
`GET .../defer-events/tipos` y `GET .../defer-events/trend` (ambos 200 OK) inmediatamente
antes del error. El error ocurre en el `transform` de algún pipe/operator justo al renderizar
la vista, no en una llamada API fallida.

## Dos frentes a investigar

### 1. El bug real: NG02100

`NG02100` en Angular apunta a la página de error oficial (`angular.dev/errors/NG02100`), pero
el código por sí solo no dice qué falló — el mensaje completo de Angular normalmente incluye
detalle después de los dos puntos (ej. nombre del pipe, del binding, etc.), y ese detalle **no
llegó al log**.

- Buscar el componente de `defer-events` (probablemente en
  `src/app/features/intranet/pages/.../monitoreo-correos/` o similar, cerca de `quarantine`,
  `domain-pauses`) y revisar los pipes/transforms usados en su template — la pista `transform`
  en la stack trace sugiere un pipe de Angular (`| algo`) o un `computed`/`toSignal` fallando
  al procesar el resultado de `/defer-events/tipos` o `/defer-events/trend`.
- Confirmar si el error es reproducible navegando la misma secuencia (o directo a la URL).
- Candidatos típicos de NG02100: pipe que recibe `undefined`/tipo inesperado, o un
  `NgOptimizedImage`/`@defer` mal configurado (dado el nombre de la ruta "defer-events", vale
  la pena descartar confusión con la directiva `@defer` de Angular, aunque es coincidencia de
  nombre con la feature de negocio).

### 2. El logger trunca el mensaje

El sistema de logging custom del frontend (el que reporta a "Error de Frontend" /
"CRITICAL") está guardando solo `error.message` cuando Angular lanza `NG02100: <detalle>` —
pero el detalle no aparece. Hay que:

- Ubicar el interceptor/handler global de errores de Angular (`ErrorHandler` custom, o el
  wrapper que arma el payload para `/api/.../frontend-errors` o similar).
- Confirmar si el truncamiento es real (¿el backend recorta el campo `mensaje`? ¿el frontend
  solo captura `error.name` en vez de `error.message` completo?) o si Angular en producción
  (build optimizado) genuinemente no incluye el detalle porque los mensajes de error extendidos
  se stripean en builds de prod (Angular hace esto para reducir bundle size — los mensajes
  completos solo existen en dev build).
- Si es lo segundo (mensajes stripeados en prod), evaluar si vale la pena loguear también
  `error.stack` completo (ya se loguea) más algún dato adicional que permita triangular el pipe
  sin necesitar el mensaje completo, en vez de intentar "des-truncar" algo que Angular no
  genera en prod.

## Criterio de cierre

- [ ] Identificado el pipe/transform específico que causa NG02100 en `defer-events`.
- [ ] Determinado si el truncamiento del mensaje es un bug del logger o un comportamiento
      esperado de Angular en build de producción.
- [ ] Fix aplicado al bug real (si corresponde) y, si el logger es el problema, fix o
      documentación de la limitación.
- [ ] Verificado manualmente en el browser navegando a `defer-events` sin error.
