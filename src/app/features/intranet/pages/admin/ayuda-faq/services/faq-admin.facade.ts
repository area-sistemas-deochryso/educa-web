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
	ActualizarFaqRequest,
	CrearFaqRequest,
	FaqAdminDto,
} from '../models/faq-admin.models';
import { FaqAdminService } from './faq-admin.service';
// #endregion

/**
 * Estado + CRUD de la vista admin de FAQ (`AYUDA_MANAGE`, brief 483).
 * Scoped al componente (no `providedIn: 'root'`) — mismo motivo que
 * `AyudaQaFacade`: el listado/búsqueda se reinicia al entrar a la vista.
 *
 * Mutaciones vía `WalFacadeHelper.execute({ consistencyLevel: 'server-confirmed' })`
 * (regla de lint `wal/no-direct-mutation-subscribe`) — nunca `.subscribe()` directo
 * sobre el service HTTP para crear/editar/eliminar.
 */
@Injectable()
export class FaqAdminFacade {
	// #region Dependencies
	private readonly api = inject(FaqAdminService);
	private readonly wal = inject(WalFacadeHelper);
	private readonly errorHandler = inject(ErrorHandlerService);
	private readonly destroyRef = inject(DestroyRef);

	private readonly apiUrl = `${environment.apiUrl}/api/admin/faq`;
	// #endregion

	// #region State
	private readonly _faqs = signal<FaqAdminDto[]>([]);
	private readonly _loading = signal(false);
	private readonly _error = signal(false);
	private readonly _saving = signal(false);
	private readonly _searchTerm = signal('');

	readonly faqs = this._faqs.asReadonly();
	readonly loading = this._loading.asReadonly();
	readonly error = this._error.asReadonly();
	readonly saving = this._saving.asReadonly();
	readonly searchTerm = this._searchTerm.asReadonly();

	/** Filtro client-side por texto libre — sin endpoint de búsqueda propio en admin. */
	readonly filteredFaqs = computed(() => {
		const term = this._searchTerm().trim().toLowerCase();
		if (!term) return this._faqs();
		return this._faqs().filter(
			(f) =>
				f.pregunta.toLowerCase().includes(term) ||
				f.respuesta.toLowerCase().includes(term) ||
				(f.categoria ?? '').toLowerCase().includes(term),
		);
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
					logger.warn('[FaqAdminFacade] Error cargando FAQ admin', err?.status);
					this._error.set(true);
					return of([] as FaqAdminDto[]);
				}),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((faqs) => {
				this._faqs.set(faqs);
				this._loading.set(false);
			});
	}
	// #endregion

	// #region Commands — CRUD
	crear(request: CrearFaqRequest, onSuccess: () => void): void {
		this._saving.set(true);

		this.wal.execute<FaqAdminDto>({
			operation: 'CREATE',
			resourceType: 'faq-admin',
			endpoint: this.apiUrl,
			method: 'POST',
			payload: request,
			consistencyLevel: 'server-confirmed',
			http$: () => this.api.crear(request),
			onCommit: (faq) => {
				this._saving.set(false);
				this._faqs.update((list) => [faq, ...list]);
				this.errorHandler.showSuccess('FAQ creada', `"${faq.pregunta}" fue creada.`);
				onSuccess();
			},
			onError: (err) => {
				this._saving.set(false);
				logger.error('[FaqAdminFacade] Error al crear FAQ', err);
				this.errorHandler.showError('No se pudo crear', this.resolveErrorMessage(err, 'crear'));
			},
		});
	}

	actualizar(id: number, request: ActualizarFaqRequest, onSuccess: () => void): void {
		this._saving.set(true);

		this.wal.execute<FaqAdminDto>({
			operation: 'UPDATE',
			resourceType: 'faq-admin',
			resourceId: id,
			endpoint: `${this.apiUrl}/${id}`,
			method: 'PUT',
			payload: request,
			consistencyLevel: 'server-confirmed',
			optimistic: { apply: () => {}, rollback: () => {} },
			http$: () => this.api.actualizar(id, request),
			onCommit: (faq) => {
				this._saving.set(false);
				this._faqs.update((list) => list.map((f) => (f.id === id ? faq : f)));
				this.errorHandler.showSuccess('FAQ actualizada', `"${faq.pregunta}" fue actualizada.`);
				onSuccess();
			},
			onError: (err) => {
				this._saving.set(false);
				logger.error('[FaqAdminFacade] Error al actualizar FAQ', err);
				if (this.extractStatus(err) === 409) {
					this.errorHandler.showWarning(
						'Conflicto de edición',
						'La FAQ fue modificada por otro usuario. Recargando el listado.',
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

	eliminar(faq: FaqAdminDto, onSuccess: () => void): void {
		this.wal.execute<void>({
			operation: 'DELETE',
			resourceType: 'faq-admin',
			resourceId: faq.id,
			endpoint: `${this.apiUrl}/${faq.id}`,
			method: 'DELETE',
			payload: { id: faq.id },
			consistencyLevel: 'server-confirmed',
			optimistic: { apply: () => {}, rollback: () => {} },
			http$: () => this.api.eliminar(faq.id),
			onCommit: () => {
				this._faqs.update((list) => list.filter((f) => f.id !== faq.id));
				this.errorHandler.showSuccess('FAQ eliminada', `"${faq.pregunta}" fue eliminada.`);
				onSuccess();
			},
			onError: (err) => {
				logger.error('[FaqAdminFacade] Error al eliminar FAQ', err);
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
			return 'No tienes permiso para administrar FAQ.';
		}
		return `Ocurrió un error al ${action} la FAQ. Intenta de nuevo.`;
	}
	// #endregion
}
