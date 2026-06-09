// #region Imports
import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '../auth';
import { APP_USER_ROLES, AppUserRole } from '@app/shared/constants';
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

	private readonly _userRole = signal<AppUserRole>('');
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

	/** @deprecated 2026-06-08 — use rol()?.nombre or behavioral flags (esStaff, esPasivo, requiereSalon). Remove after 2026-07-08. */
	readonly isEstudiante = computed(() => this._userRole() === APP_USER_ROLES.Estudiante);
	/** @deprecated 2026-06-08 — use rol()?.nombre or behavioral flags. Remove after 2026-07-08. */
	readonly isApoderado = computed(() => this._userRole() === APP_USER_ROLES.Apoderado);
	/** @deprecated 2026-06-08 — use rol()?.nombre or behavioral flags. Remove after 2026-07-08. */
	readonly isProfesor = computed(() => this._userRole() === APP_USER_ROLES.Profesor);
	/** @deprecated 2026-06-08 — use rol()?.nombre or behavioral flags. Remove after 2026-07-08. */
	readonly isDirector = computed(() => this._userRole() === APP_USER_ROLES.Director);
	/** @deprecated 2026-06-08 — use rol()?.nombre or behavioral flags. Remove after 2026-07-08. */
	readonly isAsistenteAdministrativo = computed(
		() => this._userRole() === APP_USER_ROLES.AsistenteAdministrativo,
	);
	/** @deprecated 2026-06-08 — use rol()?.nombre or behavioral flags. Remove after 2026-07-08. */
	readonly isPromotor = computed(() => this._userRole() === APP_USER_ROLES.Promotor);
	/** @deprecated 2026-06-08 — use rol()?.nombre or behavioral flags. Remove after 2026-07-08. */
	readonly isCoordinadorAcademico = computed(
		() => this._userRole() === APP_USER_ROLES.CoordinadorAcademico,
	);

	/** @deprecated 2026-06-08 — use rol()?.esStaff. Remove after 2026-07-08. */
	readonly isAdministrativo = computed(
		() =>
			this.isDirector() ||
			this.isAsistenteAdministrativo() ||
			this.isPromotor() ||
			this.isCoordinadorAcademico(),
	);

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
				this._userRole.set(user.rol as AppUserRole);
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
			this._userRole.set(user.rol as AppUserRole);
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
