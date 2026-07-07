import { Observable } from 'rxjs';

import {
	facadeErrorHandler, type FacadeErrorHandler,
} from '@core/helpers';
import type { ErrorHandlerService } from '@core/services/error';
import type { WalFacadeHelper, WalConsistencyLevel } from '@core/services/wal';
import type { BaseCrudStore } from '@core/store';
// eslint-disable-next-line layer-enforcement/imports-error -- DEBT: xrepo-50-F3a
import type { HasId } from '@shared/interfaces';
import type { HasEstado } from './base-crud.facade.types';

// #region Config types

export interface WalCrudOpsConfig {
	tag: string;
	resourceType: string;
	apiUrl: string;
}

export interface WalCrudCallbacks {
	optimisticApply?: () => void;
	optimisticRollback?: () => void;
	onCommit?: (result: unknown) => void;
	onError?: (err: unknown) => void;
	errorLabel?: string;
}

type HttpMethod = 'PUT' | 'PATCH' | 'POST' | 'DELETE';

interface BaseOptions {
	consistencyLevel?: WalConsistencyLevel;
	callbacks?: WalCrudCallbacks;
}

// #endregion

export class WalCrudOps<
	T extends HasId,
	TForm = Record<string, unknown>,
	TStats = Record<string, unknown>,
> {
	private readonly _errHandler: FacadeErrorHandler;

	constructor(
		private readonly wal: WalFacadeHelper,
		private readonly store: BaseCrudStore<T, TForm, TStats>,
		private readonly config: WalCrudOpsConfig,
		errorHandler: ErrorHandlerService,
	) {
		this._errHandler = facadeErrorHandler({
			tag: config.tag,
			errorHandler,
		});
	}

	// #region CREATE

	walCreate(
		payload: unknown,
		http$: () => Observable<unknown>,
		options?: BaseOptions & { endpointSuffix?: string },
	): void {
		const suffix = options?.endpointSuffix ?? 'crear';
		const cb = options?.callbacks;

		this.store.setSaving(true);
		this.wal.execute({
			operation: 'CREATE',
			resourceType: this.config.resourceType,
			endpoint: `${this.config.apiUrl}/${suffix}`,
			method: 'POST',
			payload,
			http$,
			consistencyLevel: options?.consistencyLevel,
			optimistic: {
				apply: () => {
					if (cb?.optimisticApply) {
						cb.optimisticApply();
					} else {
						this.store.closeDialog();
					}
					this.store.setSaving(false);
				},
				rollback: () => {
					this.store.setSaving(false);
					cb?.optimisticRollback?.();
				},
			},
			onCommit: (result) => cb?.onCommit?.(result),
			onError: (err) => {
				this.store.setSaving(false);
				if (cb?.onError) {
					cb.onError(err);
				} else {
					this._errHandler.handle(err, cb?.errorLabel ?? 'guardar');
				}
			},
		});
	}

	// #endregion

	// #region UPDATE

	walUpdate(
		id: number,
		payload: unknown,
		optimisticUpdates: Partial<T>,
		http$: () => Observable<unknown>,
		options?: BaseOptions & { method?: HttpMethod; endpointSuffix?: string },
	): void {
		const snapshot = this.store.items().find((i) => i.id === id);
		const method = options?.method ?? 'PUT';
		const suffix = options?.endpointSuffix ?? `${id}/actualizar`;
		const cb = options?.callbacks;

		this.store.setSaving(true);
		this.wal.execute({
			operation: 'UPDATE',
			resourceType: this.config.resourceType,
			resourceId: id,
			endpoint: `${this.config.apiUrl}/${suffix}`,
			method,
			payload,
			http$,
			consistencyLevel: options?.consistencyLevel,
			optimistic: {
				apply: () => {
					this.store.updateItem(id, optimisticUpdates);
					if (cb?.optimisticApply) {
						cb.optimisticApply();
					} else {
						this.store.closeDialog();
					}
					this.store.setSaving(false);
				},
				rollback: () => {
					this.store.setSaving(false);
					if (snapshot) this.store.updateItem(id, snapshot);
					cb?.optimisticRollback?.();
				},
			},
			onCommit: (result) => cb?.onCommit?.(result),
			onError: (err) => {
				this.store.setSaving(false);
				if (cb?.onError) {
					cb.onError(err);
				} else {
					this._errHandler.handle(err, cb?.errorLabel ?? 'guardar');
				}
			},
		});
	}

	// #endregion

	// #region TOGGLE

	walToggle(
		item: T & HasEstado,
		payload: unknown,
		http$: () => Observable<unknown>,
		toggleFn: (id: number) => void,
		options?: BaseOptions & {
			method?: HttpMethod;
			endpointSuffix?: string;
			statsDelta?: (sign: 1 | -1) => void;
		},
	): void {
		const method = options?.method ?? 'PUT';
		const suffix = options?.endpointSuffix ?? `${item.id}/actualizar`;
		const cb = options?.callbacks;

		this.wal.execute({
			operation: 'TOGGLE',
			resourceType: this.config.resourceType,
			resourceId: item.id,
			endpoint: `${this.config.apiUrl}/${suffix}`,
			method,
			payload,
			http$,
			consistencyLevel: options?.consistencyLevel,
			optimistic: {
				apply: () => {
					toggleFn(item.id);
					options?.statsDelta?.(1);
					cb?.optimisticApply?.();
				},
				rollback: () => {
					toggleFn(item.id);
					options?.statsDelta?.(-1);
					cb?.optimisticRollback?.();
				},
			},
			onCommit: (result) => cb?.onCommit?.(result),
			onError: (err) => cb?.onError ? cb.onError(err) : this._errHandler.handle(err, cb?.errorLabel ?? 'cambiar el estado'),
		});
	}

	// #endregion

	// #region DELETE SOFT

	walDeleteSoft(
		item: T & HasEstado,
		http$: () => Observable<unknown>,
		options?: BaseOptions & {
			endpointSuffix?: string;
			statsDelta?: (sign: 1 | -1) => void;
		},
	): void {
		const suffix = options?.endpointSuffix ?? `${item.id}/eliminar`;
		const estadoPrevio = item.estado;
		const estadoInactivoTyped = typeof estadoPrevio === 'number' ? 0 : false;
		const cb = options?.callbacks;

		this.wal.execute({
			operation: 'DELETE',
			resourceType: this.config.resourceType,
			resourceId: item.id,
			endpoint: `${this.config.apiUrl}/${suffix}`,
			method: 'DELETE',
			payload: null,
			http$,
			consistencyLevel: options?.consistencyLevel,
			optimistic: {
				apply: () => {
					this.store.updateItem(item.id, { estado: estadoInactivoTyped } as unknown as Partial<T>);
					options?.statsDelta?.(1);
					cb?.optimisticApply?.();
				},
				rollback: () => {
					this.store.updateItem(item.id, { estado: estadoPrevio } as unknown as Partial<T>);
					options?.statsDelta?.(-1);
					cb?.optimisticRollback?.();
				},
			},
			onCommit: (result) => cb?.onCommit?.(result),
			onError: (err) => cb?.onError ? cb.onError(err) : this._errHandler.handle(err, cb?.errorLabel ?? 'eliminar'),
		});
	}

	// #endregion

	// #region DELETE HARD

	walDeleteHard(
		item: T,
		http$: () => Observable<unknown>,
		options?: BaseOptions & {
			endpointSuffix?: string;
			statsDelta?: (sign: 1 | -1) => void;
		},
	): void {
		const suffix = options?.endpointSuffix ?? `${item.id}/eliminar`;
		const cb = options?.callbacks;

		this.wal.execute({
			operation: 'DELETE',
			resourceType: this.config.resourceType,
			resourceId: item.id,
			endpoint: `${this.config.apiUrl}/${suffix}`,
			method: 'DELETE',
			payload: null,
			http$,
			consistencyLevel: options?.consistencyLevel,
			optimistic: {
				apply: () => {
					this.store.removeItem(item.id);
					options?.statsDelta?.(1);
					cb?.optimisticApply?.();
				},
				rollback: () => {
					this.store.addItem(item);
					options?.statsDelta?.(-1);
					cb?.optimisticRollback?.();
				},
			},
			onCommit: (result) => cb?.onCommit?.(result),
			onError: (err) => cb?.onError ? cb.onError(err) : this._errHandler.handle(err, cb?.errorLabel ?? 'eliminar'),
		});
	}

	// #endregion
}
