import { Injectable, inject, signal, computed, DestroyRef, effect } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { tap, catchError, of, firstValueFrom, timer, Subject, takeUntil } from 'rxjs';

import { logger } from '@core/helpers';
import { AuthService } from '../auth';
import { StorageService } from '../storage';
import { PermisosService } from './permisos.service';
import { PermisosUsuarioResultado } from './permisos.models';

/** Intervalo en ms entre cada verificación de expiración del token de permisos (5 min) */
const PERMISOS_CHECK_INTERVAL_MS = 5 * 60 * 1000;

@Injectable({
	providedIn: 'root',
})
export class UserPermisosService {
	// * Manages current user permissions with refresh + storage.
	private authService = inject(AuthService);
	private permisosService = inject(PermisosService);
	private storageService = inject(StorageService);
	private destroyRef = inject(DestroyRef);

	/** Cancela el intervalo de refresh al logout */
	private readonly stopRefresh$ = new Subject<void>();

	private readonly _permisos = signal<PermisosUsuarioResultado | null>(null);
	private readonly _loading = signal(false);
	private readonly _loaded = signal(false);
	private readonly _loadFailed = signal(false);

	readonly permisos = this._permisos.asReadonly();
	readonly loading = this._loading.asReadonly();
	readonly loaded = this._loaded.asReadonly();
	readonly loadFailed = this._loadFailed.asReadonly();

	readonly isAuthenticated = toSignal(this.authService.isAuthenticated$, { initialValue: false });

	readonly vistasPermitidas = computed(() => this._permisos()?.vistasPermitidas ?? []);

	readonly tienePermisosPersonalizados = computed(
		() => this._permisos()?.tienePermisosPersonalizados ?? false,
	);

	// Guarda el estado anterior de autenticación para detectar cambios
	private wasAuthenticated = false;

	constructor() {
		logger.tagged(
			'UserPermisosService',
			'log',
			'Constructor - intentando cargar desde storage',
		);
		// Intentar cargar permisos desde storage al iniciar
		this.loadFromStorage();

		// Effect que maneja cambios de autenticación
		effect(() => {
			const authenticated = this.isAuthenticated();

			if (!authenticated) {
				// Usuario cerró sesión - limpiar todo
				logger.tagged(
					'UserPermisosService',
					'log',
					'Usuario no autenticado - limpiando permisos',
				);
				this._permisos.set(null);
				this._loaded.set(false);
				this._loading.set(false);
				this._loadFailed.set(false);
				this.wasAuthenticated = false;
				this.stopPermisosRefresh();
			} else if (!this.wasAuthenticated) {
				// Usuario acaba de iniciar sesión (transición de no autenticado a autenticado)
				// Forzar reset de flags para permitir nueva carga
				logger.tagged(
					'UserPermisosService',
					'log',
					'Nuevo login detectado - reseteando estado para nueva carga',
				);
				this._permisos.set(null);
				this._loaded.set(false);
				this._loading.set(false);
				this._loadFailed.set(false);
				this.wasAuthenticated = true;
				// Intentar cargar desde storage (que ahora tendrá el nuevo sessionKey)
				this.loadFromStorage();
				this.startPermisosRefresh();
			}
		});
	}

	/**
	 * Carga los permisos desde el storage si existen
	 */
	private loadFromStorage(): void {
		logger.tagged('UserPermisosService', 'log', 'loadFromStorage() - buscando en storage...');
		const storedPermisos = this.storageService.getPermisos();
		logger.tagged(
			'UserPermisosService',
			'log',
			'loadFromStorage() - resultado:',
			storedPermisos,
		);
		if (storedPermisos) {
			// Si tiene token y está expirado, cargar como stale — startPermisosRefresh refrescará inmediatamente
			if (storedPermisos.permisosToken && this.isTokenExpired(storedPermisos.permisosToken)) {
				logger.tagged(
					'UserPermisosService',
					'log',
					'loadFromStorage() - token de permisos expirado, se cargará cache como stale',
				);
			}
			this._permisos.set(storedPermisos);
			this._loaded.set(true);
			logger.tagged(
				'UserPermisosService',
				'log',
				'loadFromStorage() - permisos cargados desde storage exitosamente',
			);
		} else {
			logger.tagged(
				'UserPermisosService',
				'log',
				'loadFromStorage() - no hay permisos en storage',
			);
		}
	}

	/**
	 * Guarda los permisos en storage
	 */
	private saveToStorage(permisos: PermisosUsuarioResultado): void {
		logger.tagged('UserPermisosService', 'log', 'saveToStorage() - guardando:', permisos);
		this.storageService.setPermisos(permisos);
	}

	/**
	 * Carga los permisos del usuario actual
	 */
	loadPermisos(destroyRef: DestroyRef): void {
		if (!this.authService.isAuthenticated) {
			this.clear();
			return;
		}

		// Si ya están cargados o cargando, no hacer nada
		if (this._loaded() || this._loading()) {
			return;
		}

		this._loading.set(true);

		this.permisosService
			.getMisPermisos()
			.pipe(
				tap((permisos) => {
					this._permisos.set(permisos);
					this._loaded.set(true);
					this._loading.set(false);
					// Guardar en storage para persistencia
					if (permisos) {
						this.saveToStorage(permisos);
					}
				}),
				catchError(() => {
					this._loading.set(false);
					this._loaded.set(true);
					return of(null);
				}),
				takeUntilDestroyed(destroyRef),
			)
			.subscribe();
	}

	/**
	 * Carga los permisos y retorna una Promise que indica si se cargaron correctamente
	 * Útil para guards que necesitan esperar
	 * @returns true si los permisos se cargaron correctamente, false si falló
	 */
	async ensurePermisosLoaded(): Promise<boolean> {
		logger.tagged('UserPermisosService', 'log', 'ensurePermisosLoaded() - INICIO');
		logger.tagged(
			'UserPermisosService',
			'log',
			'ensurePermisosLoaded() - isAuthenticated:',
			this.authService.isAuthenticated,
		);

		if (!this.authService.isAuthenticated) {
			logger.tagged(
				'UserPermisosService',
				'log',
				'ensurePermisosLoaded() - No autenticado, limpiando y retornando false',
			);
			this.clear();
			return false;
		}

		// Si ya están cargados y tenemos permisos, retornar éxito
		if (this._loaded() && this._permisos() !== null) {
			logger.tagged(
				'UserPermisosService',
				'log',
				'ensurePermisosLoaded() - Ya cargados, retornando true',
			);
			return true;
		}

		// Si ya intentamos y falló, retornar false sin reintentar
		if (this._loadFailed()) {
			logger.tagged(
				'UserPermisosService',
				'log',
				'ensurePermisosLoaded() - Ya falló anteriormente, retornando false',
			);
			return false;
		}

		// Si no están cargando, iniciar la carga
		if (!this._loading()) {
			logger.tagged(
				'UserPermisosService',
				'log',
				'ensurePermisosLoaded() - Iniciando carga desde API...',
			);
			this._loading.set(true);
			this._loadFailed.set(false);

			try {
				logger.tagged(
					'UserPermisosService',
					'log',
					'ensurePermisosLoaded() - Llamando getMisPermisos()...',
				);
				const permisos = await firstValueFrom(this.permisosService.getMisPermisos());
				logger.tagged(
					'UserPermisosService',
					'log',
					'ensurePermisosLoaded() - Respuesta del API:',
					permisos,
				);
				this._permisos.set(permisos);
				this._loaded.set(true);
				this._loading.set(false);
				// Guardar en storage para persistencia
				if (permisos) {
					this.saveToStorage(permisos);
				}
				logger.tagged(
					'UserPermisosService',
					'log',
					'ensurePermisosLoaded() - Carga exitosa, retornando true',
				);
				return true;
			} catch (error) {
				logger.tagged(
					'UserPermisosService',
					'error',
					'ensurePermisosLoaded() - ERROR en la carga:',
					error,
				);
				this._loading.set(false);
				this._loaded.set(false);
				this._loadFailed.set(true);
				return false;
			}
		}

		// Si está cargando, esperar a que termine y verificar resultado
		logger.tagged(
			'UserPermisosService',
			'log',
			'ensurePermisosLoaded() - Ya está cargando, esperando...',
		);
		await this.waitForLoaded();
		const result = !this._loadFailed() && this._permisos() !== null;
		logger.tagged(
			'UserPermisosService',
			'log',
			'ensurePermisosLoaded() - Espera terminada, resultado:',
			result,
		);
		return result;
	}

	/**
	 * Espera hasta que los permisos estén cargados o haya fallado la carga
	 */
	private waitForLoaded(): Promise<void> {
		return new Promise((resolve) => {
			const checkLoaded = () => {
				if (this._loaded() || this._loadFailed()) {
					resolve();
				} else {
					setTimeout(checkLoaded, 50);
				}
			};
			checkLoaded();
		});
	}

	/**
	 * Verifica si el usuario tiene permiso para acceder a una ruta
	 * IMPORTANTE: Solo coincidencia exacta - tener permiso a "intranet" NO da acceso a "intranet/admin"
	 */
	tienePermiso(ruta: string): boolean {
		const vistas = this.vistasPermitidas();

		logger.tagged('UserPermisosService', 'log', 'tienePermiso("' + ruta + '")');
		logger.tagged(
			'UserPermisosService',
			'log',
			'tienePermiso - loaded:',
			this._loaded(),
			'vistas:',
			vistas,
		);

		// Si los permisos están cargados pero el array está vacío,
		// significa que no hay permisos configurados -> permitir todo
		if (this._loaded() && vistas.length === 0) {
			logger.tagged(
				'UserPermisosService',
				'log',
				'tienePermiso - No hay permisos configurados, permitiendo todo',
			);
			return true;
		}

		// Si no hay permisos cargados aún, denegar por defecto
		if (!this._loaded()) {
			logger.tagged(
				'UserPermisosService',
				'log',
				'tienePermiso - Permisos no cargados, denegando',
			);
			return false;
		}

		// Normalizar la ruta (quitar / inicial si existe y convertir a minúsculas)
		const rutaNormalizada = (ruta.startsWith('/') ? ruta.substring(1) : ruta).toLowerCase();

		// Verificar si la ruta está permitida - SOLO coincidencia exacta
		const resultado = vistas.some((vista) => {
			const vistaNormalizada = (
				vista.startsWith('/') ? vista.substring(1) : vista
			).toLowerCase();
			// Solo coincidencia exacta - NO permitir acceso a rutas hijas
			const match = rutaNormalizada === vistaNormalizada;
			if (match) {
				logger.tagged(
					'UserPermisosService',
					'log',
					'tienePermiso - Match exacto encontrado:',
					vista,
					'===',
					ruta,
				);
			}
			return match;
		});

		logger.tagged('UserPermisosService', 'log', 'tienePermiso("' + ruta + '") =', resultado);
		return resultado;
	}

	/**
	 * Filtra un array de rutas según los permisos del usuario
	 */
	filtrarRutasPermitidas<T extends { route: string }>(items: T[]): T[] {
		const vistas = this.vistasPermitidas();

		// Si no hay permisos configurados, devolver todos los items
		if (this._loaded() && vistas.length === 0) {
			return items;
		}

		return items.filter((item) => this.tienePermiso(item.route));
	}

	/**
	 * Limpia los permisos (para logout)
	 */
	clear(): void {
		this.stopPermisosRefresh();
		this._permisos.set(null);
		this._loaded.set(false);
		this._loading.set(false);
		this._loadFailed.set(false);
		// Limpiar del storage
		this.storageService.clearPermisos();
	}

	/**
	 * Recarga los permisos del servidor
	 */
	reloadPermisos(destroyRef: DestroyRef): void {
		this._loaded.set(false);
		this._loading.set(false);
		this.loadPermisos(destroyRef);
	}

	// #region Refresh periódico por expiración de token

	/**
	 * Decodifica el claim 'exp' de un JWT y verifica si ya expiró.
	 * Solo lee el payload (parte central) sin verificar la firma.
	 */
	private isTokenExpired(token: string): boolean {
		try {
			const payload = JSON.parse(atob(token.split('.')[1]));
			// exp es un timestamp Unix en segundos
			return Date.now() / 1000 > payload.exp;
		} catch {
			return true; // Si no se puede decodificar, tratarlo como expirado
		}
	}

	/**
	 * Inicia el intervalo periódico que verifica la expiración del token de permisos.
	 * Si detecta expiración hace un GET automático para refrescar los permisos.
	 */
	private startPermisosRefresh(): void {
		this.stopPermisosRefresh();

		timer(0, PERMISOS_CHECK_INTERVAL_MS).pipe(
			takeUntil(this.stopRefresh$),
			takeUntilDestroyed(this.destroyRef),
		).subscribe(() => {
			const storedPermisos = this.storageService.getPermisos();
			if (storedPermisos?.permisosToken && this.isTokenExpired(storedPermisos.permisosToken)) {
				logger.tagged(
					'UserPermisosService',
					'log',
					'Token de permisos expirado - refrescando desde API...',
				);
				this.fetchPermisosFromApi();
			}
		});
	}

	/** Detiene el intervalo de refresh (se usa en logout y clear) */
	private stopPermisosRefresh(): void {
		this.stopRefresh$.next();
	}

	/** Hace un GET a la API para refrescar permisos y los guarda en storage */
	private fetchPermisosFromApi(): void {
		this.permisosService.getMisPermisos().pipe(
			takeUntil(this.stopRefresh$),
		).subscribe((permisos) => {
			if (permisos) {
				this._permisos.set(permisos);
				this._loaded.set(true);
				this.saveToStorage(permisos);
				logger.tagged('UserPermisosService', 'log', 'Permisos refrescados exitosamente');
			}
		});
	}
	// #endregion
}
