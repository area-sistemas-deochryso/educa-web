# Sistema de Storage

Tres niveles de almacenamiento:

| Servicio | Uso | Persistencia |
|----------|-----|--------------|
| SessionStorageService | Tokens, auth, permisos | Sesión |
| PreferencesStorageService | Preferencias UI | Permanente |
| IndexedDBService | Notificaciones, datos grandes | Permanente |

## Uso con StorageService (facade)

```typescript
const storage = inject(StorageService);

// SessionStorage
storage.setToken(token);
storage.getPermisos();
storage.getUser();

// Preferences
storage.setPreference(key, value);
storage.getPreference(key);
```

## Limpieza en logout

```typescript
logout(): void {
  this.userPermisosService.clear();
  this.swService.clearCache();
  this.authService.logout();
  this.router.navigate(['/intranet/login']);
}
```
