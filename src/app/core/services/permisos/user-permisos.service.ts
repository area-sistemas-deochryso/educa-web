import { Injectable, inject, signal, computed, DestroyRef, effect } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { tap, catchError, of, Observable, map, firstValueFrom } from 'rxjs';

import { AuthService } from '../auth';
import { StorageService } from '../storage';
import { PermisosService } from './permisos.service';
import { PermisosUsuarioResultado } from './permisos.models';

@Injectable({
	providedIn: 'root',
})
export class UserPermisosService {
	private authService = inject(AuthService);
	private permisosService = inject(PermisosService);
	private storageService = inject(StorageService);

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
		console.log('[UserPermisosService] Constructor - intentando cargar desde storage');
		// Intentar cargar permisos desde storage al iniciar
		this.loadFromStorage();

		// Effect que maneja cambios de autenticación
		effect(() => {
			const authenticated = this.isAuthenticated();

			if (!authenticated) {
				// Usuario cerró sesión - limpiar todo
				console.log('[UserPermisosService] Usuario no autenticado - limpiando permisos');
				this._permisos.set(null);
				this._loaded.set(false);
				this._loading.set(false);
				this._loadFailed.set(false);
				this.wasAuthenticated = false;
			} else if (!this.wasAuthenticated) {
				// Usuario acaba de iniciar sesión (transición de no autenticado a autenticado)
				// Forzar reset de flags para permitir nueva carga
				console.log(
					'[UserPermisosService] Nuevo login detectado - reseteando estado para nueva carga',
				);
				this._permisos.set(null);
				this._loaded.set(false);
				this._loading.set(false);
				this._loadFailed.set(false);
				this.wasAuthenticated = true;
				// Intentar cargar desde storage (que ahora tendrá el nuevo sessionKey)
				this.loadFromStorage();
			}
		});
	}

	/**
	 * Carga los permisos desde el storage si existen
	 */
	private loadFromStorage(): void {
		console.log('[UserPermisosService] loadFromStorage() - buscando en storage...');
		const storedPermisos = this.storageService.getPermisos();
		console.log('[UserPermisosService] loadFromStorage() - resultado:', storedPermisos);
		if (storedPermisos) {
			this._permisos.set(storedPermisos);
			this._loaded.set(true);
			console.log(
				'[UserPermisosService] loadFromStorage() - permisos cargados desde storage exitosamente',
			);
		} else {
			console.log('[UserPermisosService] loadFromStorage() - no hay permisos en storage');
		}
	}

	/**
	 * Guarda los permisos en storage
	 */
	private saveToStorage(permisos: PermisosUsuarioResultado): void {
		console.log('[UserPermisosService] saveToStorage() - guardando:', permisos);
		this.storageService.setPermisos(permisos);
	}

	/**
	 * Carga los permisos del usuario actual
	 */
	loadPermisos(destroyRef?: DestroyRef): void {
		if (!this.authService.isAuthenticated) {
			this.clear();
			return;
		}

		// Si ya están cargados o cargando, no hacer nada
		if (this._loaded() || this._loading()) {
			return;
		}

		this._loading.set(true);

		const request$ = this.permisosService.getMisPermisos().pipe(
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
		);

		if (destroyRef) {
			request$.pipe(takeUntilDestroyed(destroyRef)).subscribe();
		} else {
			request$.subscribe();
		}
	}

	/**
	 * Carga los permisos y retorna una Promise que indica si se cargaron correctamente
	 * Útil para guards que necesitan esperar
	 * @returns true si los permisos se cargaron correctamente, false si falló
	 */
	async ensurePermisosLoaded(): Promise<boolean> {
		console.log('[UserPermisosService] ensurePermisosLoaded() - INICIO');
		console.log(
			'[UserPermisosService] ensurePermisosLoaded() - isAuthenticated:',
			this.authService.isAuthenticated,
		);

		if (!this.authService.isAuthenticated) {
			console.log(
				'[UserPermisosService] ensurePermisosLoaded() - No autenticado, limpiando y retornando false',
			);
			this.clear();
			return false;
		}

		// Si ya están cargados y tenemos permisos, retornar éxito
		if (this._loaded() && this._permisos() !== null) {
			console.log(
				'[UserPermisosService] ensurePermisosLoaded() - Ya cargados, retornando true',
			);
			return true;
		}

		// Si ya intentamos y falló, retornar false sin reintentar
		if (this._loadFailed()) {
			console.log(
				'[UserPermisosService] ensurePermisosLoaded() - Ya falló anteriormente, retornando false',
			);
			return false;
		}

		// Si no están cargando, iniciar la carga
		if (!this._loading()) {
			console.log(
				'[UserPermisosService] ensurePermisosLoaded() - Iniciando carga desde API...',
			);
			this._loading.set(true);
			this._loadFailed.set(false);

			try {
				console.log(
					'[UserPermisosService] ensurePermisosLoaded() - Llamando getMisPermisos()...',
				);
				const permisos = await firstValueFrom(this.permisosService.getMisPermisos());
				console.log(
					'[UserPermisosService] ensurePermisosLoaded() - Respuesta del API:',
					permisos,
				);
				this._permisos.set(permisos);
				this._loaded.set(true);
				this._loading.set(false);
				// Guardar en storage para persistencia
				if (permisos) {
					this.saveToStorage(permisos);
				}
				console.log(
					'[UserPermisosService] ensurePermisosLoaded() - Carga exitosa, retornando true',
				);
				return true;
			} catch (error) {
				console.error(
					'[UserPermisosService] ensurePermisosLoaded() - ERROR en la carga:',
					error,
				);
				this._loading.set(false);
				this._loaded.set(false);
				this._loadFailed.set(true);
				return false;
			}
		}

		// Si está cargando, esperar a que termine y verificar resultado
		console.log(
			'[UserPermisosService] ensurePermisosLoaded() - Ya está cargando, esperando...',
		);
		await this.waitForLoaded();
		const result = !this._loadFailed() && this._permisos() !== null;
		console.log(
			'[UserPermisosService] ensurePermisosLoaded() - Espera terminada, resultado:',
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

		console.log('[UserPermisosService] tienePermiso("' + ruta + '")');
		console.log(
			'[UserPermisosService] tienePermiso - loaded:',
			this._loaded(),
			'vistas:',
			vistas,
		);

		// Si los permisos están cargados pero el array está vacío,
		// significa que no hay permisos configurados -> permitir todo
		if (this._loaded() && vistas.length === 0) {
			console.log(
				'[UserPermisosService] tienePermiso - No hay permisos configurados, permitiendo todo',
			);
			return true;
		}

		// Si no hay permisos cargados aún, denegar por defecto
		if (!this._loaded()) {
			console.log('[UserPermisosService] tienePermiso - Permisos no cargados, denegando');
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
				console.log(
					'[UserPermisosService] tienePermiso - Match exacto encontrado:',
					vista,
					'===',
					ruta,
				);
			}
			return match;
		});

		console.log('[UserPermisosService] tienePermiso("' + ruta + '") =', resultado);
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
	reloadPermisos(destroyRef?: DestroyRef): void {
		this._loaded.set(false);
		this._loading.set(false);
		this.loadPermisos(destroyRef);
	}
}
