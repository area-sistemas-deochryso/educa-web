import { signal } from '@angular/core';

/** Clave de un usuario en el registro de guardados pendientes (el `id` solo no es único entre roles). */
export function buildUsuarioKey(rol: string, id: number): string {
	return `${rol}:${id}`;
}

/**
 * Usuarios con un guardado (PUT) en vuelo. Vive en el store de la pantalla y no se persiste entre recargas.
 * Mientras un usuario está aquí, sus puertas de edición se bloquean (ver `UsersUiFacade`).
 */
export class PendingSaveRegistry {
	private readonly _keys = signal<ReadonlySet<string>>(new Set());
	readonly keys = this._keys.asReadonly();

	has(rol: string, id: number): boolean {
		return this._keys().has(buildUsuarioKey(rol, id));
	}

	mark(rol: string, id: number): void {
		this._keys.update((keys) => new Set(keys).add(buildUsuarioKey(rol, id)));
	}

	clear(rol: string, id: number): void {
		const key = buildUsuarioKey(rol, id);
		if (!this._keys().has(key)) return;
		this._keys.update((keys) => {
			const next = new Set(keys);
			next.delete(key);
			return next;
		});
	}
}
