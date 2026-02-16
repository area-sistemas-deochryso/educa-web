# PWA en iOS - Requisitos y Configuración

## Requisitos para instalabilidad

### 1. HTTPS obligatorio
iOS Safari solo permite instalar PWAs servidas por HTTPS.

### 2. Meta tags en `index.html`

```html
<!-- Manifest -->
<link rel="manifest" href="/manifest.webmanifest" />

<!-- Theme color -->
<meta name="theme-color" content="#4f46e5" />

<!-- iOS PWA -->
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="Educa" />
<link rel="apple-touch-icon" href="/images/icons/icon-192x192.png" />

<!-- Viewport con safe areas -->
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

### 3. Manifest (`public/manifest.webmanifest`)

Campos que iOS lee:
- `name` / `short_name` - Nombre de la app
- `start_url` - URL al abrir desde home screen
- `display: "standalone"` - Abre sin barra de Safari
- `scope` - Rutas permitidas dentro de la app
- `icons` - Iconos PNG cuadrados (192x192 y 512x512)

Campos que iOS **ignora**:
- `screenshots`
- `shortcuts`
- `categories`
- `orientation`

### 4. Iconos

- **Formato**: PNG obligatorio (WebP/AVIF/SVG no funcionan)
- **Tamaños requeridos**: 192x192 y 512x512 mínimo
- **Versiones maskable**: Con 20% de padding para adaptive icons (Android)
- **apple-touch-icon**: iOS usa este `<link>` en lugar de los iconos del manifest

### 5. Service Worker

Debe tener al menos:
- Evento `install`
- Evento `activate`
- Evento `fetch` (handler de peticiones)

## Barra de estado de iOS

| Valor | Comportamiento |
|-------|---------------|
| `default` | Barra sólida blanca, iOS reserva el espacio automáticamente |
| `black` | Barra sólida negra, iOS reserva el espacio automáticamente |
| `black-translucent` | Barra transparente, contenido va DEBAJO (requiere CSS padding manual) |

**Usar `default`** a menos que necesites diseño edge-to-edge. Con `black-translucent` se necesita:

```scss
.header {
  padding-top: env(safe-area-inset-top, 20px);
}
```

## Instalación en iPhone

1. Abrir **Safari** (obligatorio, Chrome/Firefox no soportan PWA en iOS)
2. Navegar a la URL de la app
3. Tocar botón **Compartir** (cuadrado con flecha hacia arriba)
4. Tocar **"Agregar a pantalla de inicio"**
5. Confirmar nombre y tocar **"Agregar"**

**No existe botón de instalar automático en iOS** como en Chrome/Android.

## Actualizaciones

| Tipo de cambio | Se actualiza solo | Requiere reinstalar |
|----------------|-------------------|---------------------|
| Código/CSS/JS | Si | No |
| Datos de API | Si (según SW cache) | No |
| Icono de la app | No | Si |
| Nombre de la app | No | Si |
| `display` mode | No | Si |
| `start_url` | No | Si |
| `status-bar-style` | No | Si |

## Limitaciones de iOS

| Limitación | Detalle |
|------------|---------|
| Push notifications | Solo desde iOS 16.4+ y solo si la PWA está instalada |
| Background sync | No soportado |
| Storage | iOS puede borrar cache del SW si no se usa la app por ~7 días |
| Instalación | Solo desde Safari, no Chrome/Firefox |
| Bluetooth/NFC | No disponible para PWA |
| Badging API | No soportado |

## Compatibilidad por versión de iOS

| iOS | Soporte |
|-----|---------|
| < 11.3 | No soporta PWA |
| 11.3 - 16.3 | PWA básica (sin push) |
| 16.4+ | PWA completa (con push) |

~95% de iPhones activos están en iOS 16.4+.

## Checklist de verificación

```
[ ] HTTPS activo en producción
[ ] manifest.webmanifest existe y es válido
[ ] <link rel="manifest"> en index.html
[ ] <meta name="apple-mobile-web-app-capable" content="yes">
[ ] <meta name="apple-mobile-web-app-status-bar-style" content="default">
[ ] <meta name="apple-mobile-web-app-title">
[ ] <link rel="apple-touch-icon"> apunta a PNG válido
[ ] viewport-fit=cover en meta viewport
[ ] Iconos PNG en 192x192 y 512x512
[ ] Service Worker registrado con fetch handler
[ ] Probar instalación desde Safari en iPhone real
[ ] Verificar que la barra de estado no solapa contenido
```
