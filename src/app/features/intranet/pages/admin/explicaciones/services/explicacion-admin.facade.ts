// #region Imports
import { HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';

import { environment } from '@env/environment';
import { logger } from '@core/helpers';
import { ErrorHandlerService } from '@core/services/error';
import { WalFacadeHelper } from '@core/services/wal';

import {
	ActualizarExplicacionRequest,
	CrearExplicacionRequest,
	ExplicacionAdminDto,
} from '../models/explicacion-admin.models';
import { ExplicacionAdminService } from './explicacion-admin.service';
// #endregion

/**
 * Estado + CRUD de la vista admin del contenido explicativo del modo informativo
 * (`EXPLICACIONES_MANAGE`, brief 525, plan xrepo-96 F3). Scoped al componente
 * (no `providedIn: 'root'`) — el listado se reinicia al entrar a la vista.
 *
 * Mutaciones vía `WalFacadeHelper.execute({ consistencyLevel: 'server-confirmed' })`
 * (regla de lint `wal/no-direct-mutation-subscribe`) — nunca `.subscribe()` directo
 * sobre el service HTTP para crear/editar/eliminar.
 */
@Injectable()
export class ExplicacionAdminFacade {
	// #region Dependencies
	private readonly api = inject(ExplicacionAdminService);
	private readonly wal = inject(WalFacadeHelper);
	private readonly errorHandler = inject(ErrorHandlerService);
	private readonly destroyRef = inject(DestroyRef);

	private readonly apiUrl = `${environment.apiUrl}/api/admin/explicaciones`;
	// #endregion

	// #region State
	private readonly _explicaciones = signal<ExplicacionAdminDto[]>([]);
	private readonly _loading = signal(false);
	private readonly _error = signal(false);
	private readonly _saving = signal(false);
	private readonly _searchTerm = signal('');

	readonly explicaciones = this._explicaciones.asReadonly();
	readonly loading = this._loading.asReadonly();
	readonly error = this._error.asReadonly();
	readonly saving = this._saving.asReadonly();
	readonly searchTerm = this._searchTerm.asReadonly();

	/** Filtro client-side por ancla — sin endpoint de búsqueda propio en admin. */
	readonly filteredExplicaciones = computed(() => {
		const term = this._searchTerm().trim().toLowerCase();
		if (!term) return this._explicaciones();
		return this._explicaciones().filter((e) => e.ancla.toLowerCase().includes(term));
	});
	// #endregion

	// #region Commands — load
	init(): void {
		this.load();
	}

	setSearchTerm(term: string): void {
		this._searchTerm.set(term);
	}

	load(): void {
		this._loading.set(true);
		this._error.set(false);

		this.api
			.getAll()
			.pipe(
				catchError((err) => {
					logger.warn('[ExplicacionAdminFacade] Error cargando explicaciones admin', err?.status);
					this._error.set(true);
					return of([] as ExplicacionAdminDto[]);
				}),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((explicaciones) => {
				this._explicaciones.set(explicaciones);
				this._loading.set(false);
			});
	}
	// #endregion

	// #region Commands — CRUD
	crear(request: CrearExplicacionRequest, onSuccess: () => void): void {
		this._saving.set(true);

		this.wal.execute<ExplicacionAdminDto>({
			operation: 'CREATE',
			resourceType: 'explicacion-admin',
			endpoint: this.apiUrl,
			method: 'POST',
			payload: request,
			consistencyLevel: 'server-confirmed',
			http$: () => this.api.crear(request),
			onCommit: (explicacion) => {
				this._saving.set(false);
				this._explicaciones.update((list) => [explicacion, ...list]);
				this.errorHandler.showSuccess('Explicación creada', `"${explicacion.ancla}" fue creada.`);
				onSuccess();
			},
			onError: (err) => {
				this._saving.set(false);
				logger.error('[ExplicacionAdminFacade] Error al crear explicación', err);
				this.errorHandler.showError('No se pudo crear', this.resolveErrorMessage(err, 'crear'));
			},
		});
	}

	actualizar(id: number, request: ActualizarExplicacionRequest, onSuccess: () => void): void {
		this._saving.set(true);

		this.wal.execute<ExplicacionAdminDto>({
			operation: 'UPDATE',
			resourceType: 'explicacion-admin',
			resourceId: id,
			endpoint: `${this.apiUrl}/${id}`,
			method: 'PUT',
			payload: request,
			consistencyLevel: 'server-confirmed',
			optimistic: { apply: () => {}, rollback: () => {} },
			http$: () => this.api.actualizar(id, request),
			onCommit: (explicacion) => {
				this._saving.set(false);
				this._explicaciones.update((list) => list.map((e) => (e.id === id ? explicacion : e)));
				this.errorHandler.showSuccess('Explicación actualizada', `"${explicacion.ancla}" fue actualizada.`);
				onSuccess();
			},
			onError: (err) => {
				this._saving.set(false);
				logger.error('[ExplicacionAdminFacade] Error al actualizar explicación', err);
				if (this.extractStatus(err) === 409) {
					this.errorHandler.showWarning(
						'Conflicto de edición',
						'La explicación fue modificada por otro usuario. Recargando el listado.',
					);
					this.load();
					return;
				}
				this.errorHandler.showError(
					'No se pudo actualizar',
					this.resolveErrorMessage(err, 'actualizar'),
				);
			},
		});
	}

	eliminar(explicacion: ExplicacionAdminDto, onSuccess: () => void): void {
		this.wal.execute<void>({
			operation: 'DELETE',
			resourceType: 'explicacion-admin',
			resourceId: explicacion.id,
			endpoint: `${this.apiUrl}/${explicacion.id}`,
			method: 'DELETE',
			payload: { id: explicacion.id },
			consistencyLevel: 'server-confirmed',
			optimistic: { apply: () => {}, rollback: () => {} },
			http$: () => this.api.eliminar(explicacion.id),
			onCommit: () => {
				this._explicaciones.update((list) => list.filter((e) => e.id !== explicacion.id));
				this.errorHandler.showSuccess('Explicación eliminada', `"${explicacion.ancla}" fue eliminada.`);
				onSuccess();
			},
			onError: (err) => {
				logger.error('[ExplicacionAdminFacade] Error al eliminar explicación', err);
				this.errorHandler.showError('No se pudo eliminar', this.resolveErrorMessage(err, 'eliminar'));
			},
		});
	}
	// #endregion

	// #region Private helpers
	private extractStatus(err: unknown): number | null {
		return err instanceof HttpErrorResponse ? err.status : null;
	}

	private resolveErrorMessage(err: unknown, action: string): string {
		if (err instanceof HttpErrorResponse && err.status === 403) {
			return 'No tienes permiso para administrar el contenido explicativo.';
		}
		if (err instanceof HttpErrorResponse && err.status === 409 && err.error?.errorCode === 'EXPLICACION_DUPLICADA') {
			return err.error?.message ?? 'Ya existe una explicación para esa ancla y rol.';
		}
		return `Ocurrió un error al ${action} la explicación. Intenta de nuevo.`;
	}
	// #endregion
}
