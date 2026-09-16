import { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, EMPTY, Observable } from 'rxjs';

import { type FacadeErrorHandler } from '@core/helpers';

export interface CrudOptions<T> {
	apiCall: Observable<T>;
	onSuccess: (result: T) => void;
	errorMsg: string;
	onError?: () => void;
	/** Reemplaza el manejo genérico de error cuando el backend responde 409 (RowVersion desactualizado). */
	onConflict?: () => void;
	saving?: boolean;
}

/**
 * Factory de `executeCrud`, atado a las dependencias del facade (evita repetir
 * `this.store`/`this.errHandler`/`this.destroyRef` en cada llamado y mantiene
 * `campus-admin.facade.ts` bajo el límite de líneas del proyecto).
 */
export function createCrudExecutor(
	destroyRef: DestroyRef,
	setSaving: (saving: boolean) => void,
	errHandler: FacadeErrorHandler,
) {
	return function executeCrud<T>({ apiCall, onSuccess, errorMsg, onError, onConflict, saving = true }: CrudOptions<T>): void {
		if (saving) setSaving(true);

		apiCall
			.pipe(
				catchError((err) => {
					if (onConflict && err instanceof HttpErrorResponse && err.status === 409) {
						if (saving) setSaving(false);
						onConflict();
						return EMPTY;
					}

					errHandler.handle(err, errorMsg.replace('No se pudo ', ''), () => {
						if (saving) setSaving(false);
						onError?.();
					});
					return EMPTY;
				}),
				takeUntilDestroyed(destroyRef),
			)
			.subscribe((result) => {
				onSuccess(result);
				if (saving) setSaving(false);
			});
	};
}
