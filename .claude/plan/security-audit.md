# Plan 16 — Auditoría de Seguridad Continua

> **Fecha**: 2026-04-16
> **Objetivo**: Establecer una revisión sistemática de seguridad que cubra los huecos que los tests unitarios no detectan: exposición de endpoints, manejo de secretos, sesiones, CORS, headers y abuso.
> **Problema**: Hay piezas de auth y permisos testeadas unitariamente, pero no existe una revisión holística de la superficie de ataque del sistema.
> **Coordinación**: Complementa Plan 12 F3 (Security Boundary Tests) con medidas no-test.

---

## Diagnóstico

| Área | Estado actual | Riesgo |
|------|-------------|--------|
| **Endpoints sin [Authorize]** | No auditado | Endpoint admin accesible anónimamente |
| **CORS** | Configurado pero no auditado | Orígenes no deseados pueden hacer requests |
| **Secretos en código** | `appsettings.json` tiene placeholders | Un commit accidental expone keys |
| **Headers de seguridad** | `SecurityHeadersMiddleware` existe | No verificado que cubra OWASP headers |
| **Rate limiting** | Configurado por política | No verificado que TODOS los endpoints sensibles tienen política |
| **Sesión y tokens** | JWT + cookies | Expiración, revocación y replay no auditados |
| **Datos sensibles en respuestas** | DNI enmascarado en algunos lugares | No verificado sistémicamente |
| **CSRF** | Middleware existe | No verificado que cubra todas las mutaciones |

---

## Fases

### F1 — Auditoría de Endpoints (CRÍTICO)

> Verificar que CADA endpoint tiene la autorización correcta.

- [ ] F1.1 Script/query que liste todos los endpoints del backend con sus atributos de seguridad:
  ```
  Para cada Controller:
  - [AllowAnonymous] → documentar POR QUÉ es anónimo
  - [Authorize] sin roles → cualquier usuario autenticado
  - [Authorize(Roles = "X")] → solo rol X
  - Sin atributo → HEREDA del controller (verificar)
  - [EnableRateLimiting("X")] → política aplicada
  ```

- [ ] F1.2 Matriz de endpoints vs roles esperados:

  | Endpoint | Anónimo | Estudiante | Apoderado | Profesor | Director |
  |----------|---------|-----------|-----------|----------|----------|
  | POST /api/auth/login | ✅ | — | — | — | — |
  | GET /api/horarios | — | ✅ | ✅ | ✅ | ✅ |
  | POST /api/admin/usuarios | — | — | — | — | ✅ |
  | POST /api/sistema/reportes-usuario | ✅ | ✅ | ✅ | ✅ | ✅ |

- [ ] F1.3 Identificar endpoints que deberían tener `[Authorize]` y no lo tienen
- [ ] F1.4 Identificar endpoints que deberían tener rate limiting y no lo tienen

### F2 — Auditoría de Secretos y Configuración

- [ ] F2.1 Verificar que `appsettings.json` NO contiene valores reales (solo placeholders)
- [ ] F2.2 Verificar que `.gitignore` excluye `appsettings.Development.json`, User Secrets, etc.
- [ ] F2.3 Grep del repo por patrones de secretos: passwords hardcoded, connection strings, API keys
- [ ] F2.4 Verificar que logs NO exponen datos sensibles (DNI completo, tokens, passwords)
- [ ] F2.5 Verificar que `DniHelper.Mask()` se usa en TODOS los puntos donde DNI llega a logs o responses

### F3 — Auditoría de Headers y CORS

- [ ] F3.1 Verificar headers de `SecurityHeadersMiddleware`:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY` o `SAMEORIGIN`
  - `X-XSS-Protection: 0` (deprecated, pero no dañino)
  - `Strict-Transport-Security` (HSTS)
  - `Content-Security-Policy` (CSP)
  - `Referrer-Policy`
  - `Permissions-Policy`

- [ ] F3.2 Verificar CORS:
  - Solo orígenes conocidos (localhost dev, Netlify prod, Capacitor)
  - No wildcard `*` en producción
  - Credentials mode correcto

- [ ] F3.3 Verificar CSRF:
  - `CsrfValidationMiddleware` cubre todas las mutaciones (POST/PUT/DELETE)
  - Excepciones documentadas (webhooks, endpoints anónimos)

### F4 — Auditoría de Sesión y Tokens

- [ ] F4.1 Verificar configuración de cookies:
  - `HttpOnly = true` (no accesible desde JS)
  - `Secure = true` en producción (solo HTTPS)
  - `SameSite = Strict` o `Lax`
  - Expiración razonable

- [ ] F4.2 Verificar JWT:
  - Algoritmo seguro (no `none`, no `HS256` con key débil)
  - Expiración configurada
  - Validación de issuer y audience
  - Token refresh tiene expiración independiente

- [ ] F4.3 Verificar que logout invalida:
  - Cookie de auth
  - Cookie de refresh
  - Cache del SW
  - Estado del AuthStore

### F5 — Auditoría de Datos Sensibles en Respuestas

- [ ] F5.1 Verificar que NINGÚN endpoint retorna:
  - Contraseñas (ni hasheadas)
  - DNI completo (siempre enmascarado en DTOs de lista)
  - Tokens en el body
  - Stack traces en producción

- [ ] F5.2 Verificar `GlobalExceptionMiddleware`:
  - En producción: mensaje genérico, sin `ex.Message` ni stack trace
  - En desarrollo: detalles completos (OK)

- [ ] F5.3 Verificar que `DniHelper.Mask()` se aplica en:
  - Todos los DTOs de lista (`*ListaDto`)
  - Todos los logs que incluyen DNI
  - Reportes de usuario (INV-RU07)

---

## Formato de entrega

Cada fase produce un **reporte** (no código) con:
- Hallazgos (qué está bien, qué está mal)
- Severidad (Crítica / Alta / Media / Baja)
- Acción correctiva (qué cambiar y dónde)

Los hallazgos Críticos y Altos se convierten en tareas de código en el carril B.

---

## Orden de ejecución

```
F1 (Endpoints) → F2 (Secretos) → F4 (Sesión) → F3 (Headers) → F5 (Datos sensibles)
```

F1 es lo más crítico: un endpoint admin sin auth es explotable inmediatamente. F2 y F4 previenen filtración de credenciales. F3 y F5 son hardening.

---

## Periodicidad

- **Ahora**: Auditoría completa (F1-F5)
- **Cada deploy significativo**: Re-ejecutar F1 (nuevos endpoints) + F2 (nuevos secretos)
- **Cada trimestre**: Auditoría completa
