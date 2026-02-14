// #region Imports
import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '../auth';
import { APP_USER_ROLES, AppUserRole } from '@app/shared/constants';

// #endregion
// #region Implementation
@Injectable({
	providedIn: 'root',
})
export class UserProfileService {
	// * Derives user identity details from AuthService.
	private authService = inject(AuthService);

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

	readonly isAuthenticated = toSignal(this.authService.isAuthenticated$, { initialValue: false });

	// Signal del usuario actual - debe crearse en contexto de inyecciÃƒÆ’Ã‚Â³n
	private readonly currentUser = toSignal(this.authService.currentUser$, { initialValue: null });

	readonly isEstudiante = computed(() => this._userRole() === APP_USER_ROLES.Estudiante);
	readonly isApoderado = computed(() => this._userRole() === APP_USER_ROLES.Apoderado);
	readonly isProfesor = computed(() => this._userRole() === APP_USER_ROLES.Profesor);
	readonly isDirector = computed(() => this._userRole() === APP_USER_ROLES.Director);
	readonly isAsistenteAdministrativo = computed(
		() => this._userRole() === APP_USER_ROLES.AsistenteAdministrativo,
	);

	readonly displayName = computed(() => {
		const name = this._userName();
		if (!name) return '';

		const parts = name.split(' ');
		if (parts.length >= 2) {
			return `${parts[0]} ${parts[parts.length - 1]}`;
		}
		return name;
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
