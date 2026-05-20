# Capacitor — App Nativa Android/iOS

## Configuración

- **App ID**: `com.educa.app`
- **Web Dir**: `dist/educa-angular/browser`
- **Build config**: `angular.json` → configuración `capacitor` (sin SSR)
- **Environment**: `environment.capacitor.ts` con `apiUrl` directo a Azure (`https://educa1.azurewebsites.net`)

## Comandos

```bash
npm run build:cap          # Build Angular con config capacitor (sin SSR)
npm run cap:sync           # Sync assets a Android/iOS
npm run cap:android        # Build + sync + abrir Android Studio
npm run cap:ios            # Build + sync + abrir Xcode
```

APK manual: Android Studio → Build → Generate App Bundles or APKs → APK(s)
Salida: `android/app/build/outputs/apk/debug/app-debug.apk`

## Diferencia Web vs Nativo

| | Web (Netlify) | Nativo (Capacitor) |
|---|---|---|
| `apiUrl` | `''` (same-origin proxy) | `'https://educa1.azurewebsites.net'` (directo) |
| Cookies | Same-origin via proxy | `CapacitorHttp` nativo (bypass CORS/SameSite) |
| SSR | Sí (`outputMode: "server"`) | No (CSR puro) |
| Service Worker | Activo (SWR cache) | Se degrada gracefully |
| SignalR | SSE via proxy | Directo (WebSocket funciona) |

## Plugins instalados

| Plugin | Uso | Estado |
|--------|-----|--------|
| `CapacitorHttp` | HTTP nativo (bypass CORS/cookies) | Habilitado en `capacitor.config.ts` |
| `CapacitorCookies` | Cookies nativas | Habilitado en `capacitor.config.ts` |
| `@capacitor/status-bar` | Control barra de estado | Inicializado en `CapacitorService` |
| `@capacitor/splash-screen` | Pantalla de carga | Auto-hide en `CapacitorService` |
| `@capacitor/camera` | Fotos/galería | Disponible via `CapacitorService` |
| `@capacitor/filesystem` | Leer/escribir archivos | Disponible via `CapacitorService` |
| `@capacitor/local-notifications` | Notificaciones locales | Disponible via `CapacitorService` |
| `@capacitor/push-notifications` | Push FCM (Android) / APNs (iOS) | Instalado, pendiente integrar con Firebase |

## CapacitorService

Ubicación: `@core/services/capacitor/capacitor.service.ts`

Servicio unificado que wrappea todos los plugins con guards `if (!this.isNative)`. Se inicializa en `AppComponent.constructor()`.

```typescript
import { CapacitorService } from '@core/services';

const cap = inject(CapacitorService);

// Plataforma
cap.isNative           // true en Android/iOS
cap.platform           // 'android' | 'ios' | 'web'

// Camera
await cap.takePhoto()          // Retorna base64 data URI o null
await cap.pickFromGallery()    // Galería

// Filesystem
await cap.saveFile(name, data)       // Guardar en Documents
await cap.readFile(name)             // Leer
await cap.downloadBlob(blob, name)   // Descargar blob de API

// Notificaciones locales
await cap.notify('Título', 'Mensaje')

// Status bar
await cap.setStatusBarLight()
await cap.setStatusBarDark()
```

## CORS

Orígenes de Capacitor en User Secrets del backend:

```
Cors:AllowedOrigins:4 = http://localhost
Cors:AllowedOrigins:5 = https://localhost
Cors:AllowedOrigins:6 = capacitor://localhost
```

## Safe Areas

Los headers (público e intranet) usan `env(safe-area-inset-top)` para evitar solapamiento con el status bar:

- `header.scss` → `.navbar { padding-top: calc(env(safe-area-inset-top, 0px) + 15px) }`
- `intranet-layout.component.scss` → `.intranet-header { padding: env(safe-area-inset-top, 0) 3rem 0 }`

## Android

- **Kotlin fix**: `build.gradle` fuerza `kotlin-stdlib:1.9.25` para evitar duplicados
- **Iconos**: Generados desde `public/images/icons/icon-maskable-512x512.png` en todas las densidades mipmap
- `.gitignore` excluye `android/` e `ios/` (se regeneran con `cap add`)

## Pendiente

- Integrar `@capacitor/push-notifications` con Firebase (backend ya tiene `FirebaseNotificationService` con topics `estudiante_{DNI}`, `profesor_{DNI}`)
- Necesita `google-services.json` de Firebase en `android/app/`
