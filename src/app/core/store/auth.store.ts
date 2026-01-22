import { computed, inject } from '@angular/core';
import {
	signalStore,
	withState,
	withComputed,
	withMethods,
	patchState,
	withHooks,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap } from 'rxjs';
import { tapResponse } from '@ngrx/operators';

import { AuthUser, LoginResponse, UserRole } from '@core/services/auth/auth.models';
import { StorageService } from '@core/services/storage';

/**
 * Estado de autenticación
 */
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
 * NgRx Signals Store para autenticación.
 * Proporciona manejo de estado reactivo con Angular Signals.
 *
 * @example
 * ```typescript
 * // En un componente
 * readonly authStore = inject(AuthStore)
 *
 * // Acceso a estado
 * isAuthenticated = this.authStore.isAuthenticated
 * user = this.authStore.user
 *
 * // Computados
 * remainingAttempts = this.authStore.remainingAttempts
 * isBlocked = this.authStore.isBlocked
 *
 * // Métodos
 * this.authStore.setUser(user)
 * this.authStore.setLoading(true)
 * this.authStore.logout()
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

		/**
		 * Token actual
		 */
		token: computed(() => store.user()?.token ?? null),
	})),

	withMethods((store, storage = inject(StorageService)) => ({
		/**
		 * Inicializa el store con datos del storage
		 */
		initialize(): void {
			const storedUser = storage.getUser();
			const hasToken = storage.hasToken();

			if (storedUser && hasToken) {
				patchState(store, {
					user: storedUser,
					isAuthenticated: true,
				});
			}
		},

		/**
		 * Establece el usuario autenticado
		 */
		setUser(user: AuthUser): void {
			patchState(store, {
				user,
				isAuthenticated: true,
				error: null,
				loginAttempts: 0,
			});
		},

		/**
		 * Actualiza el estado de carga
		 */
		setLoading(isLoading: boolean): void {
			patchState(store, { isLoading });
		},

		/**
		 * Establece un error
		 */
		setError(error: string): void {
			patchState(store, {
				error,
				isLoading: false,
			});
		},

		/**
		 * Limpia el error
		 */
		clearError(): void {
			patchState(store, { error: null });
		},

		/**
		 * Incrementa los intentos de login
		 */
		incrementAttempts(): void {
			patchState(store, {
				loginAttempts: store.loginAttempts() + 1,
			});
		},

		/**
		 * Resetea los intentos de login
		 */
		resetAttempts(): void {
			patchState(store, { loginAttempts: 0 });
		},

		/**
		 * Maneja un login exitoso
		 */
		handleLoginSuccess(response: LoginResponse, rememberMe: boolean): void {
			const user: AuthUser = {
				token: response.token,
				rol: response.rol,
				nombreCompleto: response.nombreCompleto,
				entityId: response.entityId,
				sedeId: response.sedeId,
			};

			storage.setToken(response.token, rememberMe);
			storage.setUser(user, rememberMe);

			patchState(store, {
				user,
				isAuthenticated: true,
				isLoading: false,
				error: null,
				loginAttempts: 0,
			});
		},

		/**
		 * Maneja un error de login
		 */
		handleLoginError(message: string): void {
			patchState(store, {
				error: message,
				isLoading: false,
				loginAttempts: store.loginAttempts() + 1,
			});
		},

		/**
		 * Cierra la sesión del usuario
		 */
		logout(): void {
			storage.clearAuth();

			patchState(store, {
				user: null,
				isAuthenticated: false,
				error: null,
				loginAttempts: 0,
			});
		},

		/**
		 * Actualiza datos parciales del usuario
		 */
		updateUser(updates: Partial<AuthUser>): void {
			const currentUser = store.user();
			if (currentUser) {
				const updatedUser = { ...currentUser, ...updates };
				patchState(store, { user: updatedUser });
				storage.setUser(updatedUser);
			}
		},
	})),

	withHooks({
		onInit(store) {
			// Inicializar con datos del storage al crear el store
			store.initialize();
		},
	}),
);

/**
 * Tipo del AuthStore para inyección
 */
export type AuthStoreType = InstanceType<typeof AuthStore>;
