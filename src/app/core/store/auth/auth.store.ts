// #region Imports
import { AuthUser } from '@core/services/auth/auth.models';
import { computed, inject } from '@angular/core';
import {
	patchState,
	signalStore,
	withComputed,
	withHooks,
	withMethods,
	withState,
} from '@ngrx/signals';

import { StorageService } from '@core/services/storage';

/**
 * Estado de autenticación
 */
// #endregion
// #region Implementation
export interface AuthState {
	user: AuthUser | null;
	isAuthenticated: boolean;
	isLoading: boolean;
	error: string | null;
	loginAttempts: number;
}

const MAX_LOGIN_ATTEMPTS = 3;

/**
 * Estado inicial
 */
const initialState: AuthState = {
	user: null,
	isAuthenticated: false,
	isLoading: false,
	error: null,
	loginAttempts: 0,
};

/**
 * NgRx Signals Store para autenticación (solo estado puro).
 * I/O (storage, HTTP) vive en AuthService.
 *
 * @example
 * ```typescript
 * readonly authStore = inject(AuthStore)
 *
 * // Lectura
 * authStore.user()
 * authStore.isAuthenticated()
 * authStore.remainingAttempts()
 *
 * // Mutación
 * authStore.setUser(user)
 * authStore.setLoading(true)
 * ```
 */
export const AuthStore = signalStore(
	{ providedIn: 'root' },
	withState(initialState),

	withComputed((store) => ({
		/**
		 * Intentos restantes antes de bloqueo
		 */
		remainingAttempts: computed(() => MAX_LOGIN_ATTEMPTS - store.loginAttempts()),

		/**
		 * Si el usuario está bloqueado por muchos intentos
		 */
		isBlocked: computed(() => store.loginAttempts() >= MAX_LOGIN_ATTEMPTS),

		/**
		 * Nombre del usuario actual
		 */
		userName: computed(() => store.user()?.nombreCompleto ?? ''),

		/**
		 * Rol del usuario actual
		 */
		userRole: computed(() => store.user()?.rol ?? ''),
	})),

	withMethods((store) => ({
		/** Establece el usuario autenticado */
		setUser(user: AuthUser): void {
			patchState(store, {
				user,
				isAuthenticated: true,
				error: null,
				loginAttempts: 0,
			});
		},

		/** Actualiza el estado de carga */
		setLoading(isLoading: boolean): void {
			patchState(store, { isLoading });
		},

		/** Establece un error */
		setError(error: string): void {
			patchState(store, {
				error,
				isLoading: false,
			});
		},

		/** Limpia el error */
		clearError(): void {
			patchState(store, { error: null });
		},

		/** Incrementa los intentos de login */
		incrementAttempts(): void {
			patchState(store, {
				loginAttempts: store.loginAttempts() + 1,
			});
		},

		/** Resetea los intentos de login */
		resetAttempts(): void {
			patchState(store, { loginAttempts: 0 });
		},

		/** Resetea todo el estado (para logout) */
		reset(): void {
			patchState(store, initialState);
		},
	})),

	withHooks({
		onInit(store) {
			const storage = inject(StorageService);
			const storedUser = storage.getUser();
			const hasUserInfo = storage.hasUserInfo();

			if (storedUser && hasUserInfo) {
				patchState(store, {
					user: storedUser,
					isAuthenticated: true,
				});
			}
		},
	}),
);

/**
 * Tipo del AuthStore para inyección
 */
export type AuthStoreType = InstanceType<typeof AuthStore>;
// #endregion
