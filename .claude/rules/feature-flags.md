# Feature Flags

El proyecto usa **feature flags** en los archivos de entorno para controlar funcionalidades en desarrollo.

## Configuración

```typescript
// environment.ts (producción) - features deshabilitados
features: {
  horarios: false,
  calendario: false,
  quickAccess: false,
  notifications: false,
  voiceRecognition: false,
}

// environment.development.ts - features habilitados
features: {
  horarios: true,
  calendario: true,
  quickAccess: true,
  notifications: true,
  voiceRecognition: true,
}
```

## Flags disponibles

| Flag | Descripción | Archivos afectados |
|------|-------------|-------------------|
| `horarios` | Ruta y menú de horarios | `intranet.routes.ts`, `intranet-menu.config.ts` |
| `calendario` | Ruta y menú de calendario | `intranet.routes.ts`, `intranet-menu.config.ts` |
| `quickAccess` | Accesos rápidos en home | `home.component.html` |
| `notifications` | Campana flotante | `intranet-layout.component.html` |
| `voiceRecognition` | Micrófono flotante | `intranet-layout.component.html` |

## Uso en rutas y menús

```typescript
import { environment } from '@config/environment';

const developmentRoutes: Route[] = [
  ...(environment.features.horarios ? [{ path: 'horarios', ... }] : []),
];
```

## Agregar nuevos features

1. Agregar flag en ambos archivos de environment
2. Usar spread condicional en `intranet.routes.ts` para la ruta
3. Usar spread condicional en `intranet-menu.config.ts` para el menú
4. Cuando esté listo para producción, cambiar a `true` en `environment.ts`
