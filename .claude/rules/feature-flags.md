# Feature Flags

El proyecto usa **feature flags** en los archivos de entorno para controlar funcionalidades en desarrollo.

## Configuración

```typescript
// environment.ts (producción)
features: {
  horarios: true,
  calendario: true,
  quickAccess: true,
  notifications: false,
  voiceRecognition: false,
  profesor: true,
  estudiante: true,
  ctestK6: false,
  videoconferencias: true,
  campusNavigation: false,
}

// environment.development.ts — mismas flags, algunas habilitadas para dev
```

## Flags disponibles

| Flag | Descripción | Archivos afectados |
|------|-------------|-------------------|
| `horarios` | Ruta compartida de horarios (vista usuario) | `intranet.routes.ts`, `intranet-menu.config.ts` |
| `calendario` | Ruta compartida de calendario | `intranet.routes.ts`, `intranet-menu.config.ts` |
| `quickAccess` | Accesos rápidos en home | `home.component.html` |
| `notifications` | Campana flotante de notificaciones | `intranet-layout.component.html` |
| `voiceRecognition` | Micrófono flotante de voz | `intranet-layout.component.html` |
| `profesor` | Todas las rutas del rol Profesor | `intranet.routes.ts` (PROFESOR_ROUTES) |
| `estudiante` | Todas las rutas del rol Estudiante | `intranet.routes.ts` (ESTUDIANTE_ROUTES) |
| `ctestK6` | Herramienta de testing de carga k6 | `intranet.routes.ts` |
| `videoconferencias` | Módulo de videoconferencia (JaaS/Jitsi) | `intranet.routes.ts` |
| `campusNavigation` | Navegación 3D/2D del campus | `intranet.routes.ts` |

## Uso en rutas y menús

```typescript
import { environment } from '@config/environment';

// Rutas por rol (spread condicional)
const roleFeatureRoutes: Route[] = [
  ...(environment.features.profesor ? PROFESOR_ROUTES : []),
  ...(environment.features.estudiante ? ESTUDIANTE_ROUTES : []),
];

// Rutas individuales
const developmentRoutes: Route[] = [
  ...(environment.features.horarios ? [{ path: 'horarios', ... }] : []),
  ...(environment.features.videoconferencias ? [{ path: 'videoconferencias', ... }] : []),
];
```

## Agregar nuevos features

1. Agregar flag en ambos archivos de environment
2. Usar spread condicional en `intranet.routes.ts` para la ruta
3. Usar spread condicional en `intranet-menu.config.ts` para el menú
4. Cuando esté listo para producción, cambiar a `true` en `environment.ts`
