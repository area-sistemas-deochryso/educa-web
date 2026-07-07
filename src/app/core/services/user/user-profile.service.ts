// #region Imports
import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '../auth';
import { RolService } from '@core/services/roles';
import { type Rol } from '@data/models';

// #endregion
// #region Implementation
@Injectable({
	providedIn: 'root',
})
export class UserProfileService {
	private authService = inject(AuthService);
	private rolService = inject(RolService);

	private readonly _userRole = signal<string>('');
	private readonly _userName = signal('');
	private readonly _entityId = signal<number | null>(null);
	private readonly _sedeId = signal<number | null>(null);
	private readonly _dni = signal<string | null>(null);

	readonly userRole = this._userRole.asReadonly();
	readonly userName = this._userName.asReadonly();
	readonly entityId = this._entityId.asReadonly();
	readonly sedeId = this._sedeId.asReadonly();
	readonly dni = this._dni.asReadonly();

	/** Rol object resolved from the endpoint cache. Undefined if not authenticated or cache empty. */
	readonly rol = computed<Rol | undefined>(() => this.rolService.byNombre(this._userRole()));

	readonly isAuthenticated = toSignal(this.authService.isAuthenticated$, { initialValue: false });

	private readonly currentUser = toSignal(this.authService.currentUser$, { initialValue: null });

	readonly isProfesor = computed(() => this.rol()?.nombre === 'Profesor');

	/**
	 * Roles con panel administrativo pero sin obligación de marcar asistencia
	 * (Administrador queda afuera a propósito: no tiene obligación de marcar
	 * asistencia y nadie le revisa la suya).
	 */
	readonly isAdministrativo = computed(() => {
		const nombre = this.rol()?.nombre;
		return (
			nombre === 'Director' ||
			nombre === 'Asistente Administrativo' ||
			nombre === 'Promotor' ||
			nombre === 'Coordinador Académico'
		);
	});

	readonly displayName = computed(() => this._userName());

	/** Nombre corto para el header: primer apellido + primer nombre (ej: "SANCHEZ MARIA"). */
	readonly shortName = computed(() => {
		const full = this._userName();
		if (!full) return '';
		const parts = full.split(' ').filter((p) => p.length > 0);
		// Formato "Apellido1 Apellido2 Nombre1 ...": tomar parts[0] + parts[2].
		if (parts.length >= 3) return `${parts[0]} ${parts[2]}`;
		return full;
	});

	readonly initials = computed(() => {
		const name = this._userName();
		if (!name) return '';

		const parts = name.split(' ').filter((p) => p.length > 0);
		if (parts.length >= 2) {
			return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
		}
		return parts[0]?.[0]?.toUpperCase() || '';
	});

	constructor() {
		this.syncWithAuth();

		effect(() => {
			const user = this.currentUser();
			if (user) {
				this._userRole.set(user.rol);
				this._userName.set(user.nombreCompleto);
				this._entityId.set(user.entityId);
				this._sedeId.set(user.sedeId);
				this._dni.set(user.dni ?? null);
			} else {
				this.clear();
			}
		});
	}

	private syncWithAuth(): void {
		const user = this.authService.currentUser;
		if (user) {
			this._userRole.set(user.rol);
			this._userName.set(user.nombreCompleto);
			this._entityId.set(user.entityId);
			this._sedeId.set(user.sedeId);
			this._dni.set(user.dni ?? null);
		}
	}

	private clear(): void {
		this._userRole.set('');
		this._userName.set('');
		this._entityId.set(null);
		this._sedeId.set(null);
		this._dni.set(null);
	}
}
// #endregion
