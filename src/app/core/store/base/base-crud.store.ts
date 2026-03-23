import { Injectable, Signal, WritableSignal, computed, signal } from '@angular/core';

import { HasId } from '@shared/interfaces';

// #region Types
/**
 * Estado de paginación server-side.
 * Stores que no usan paginación pueden ignorar estos signals.
 */
export interface PaginationSignals {
	readonly page: Signal<number>;
	readonly pageSize: Signal<number>;
	readonly totalRecords: Signal<number>;
}
// #endregion

/**
 * Base class para stores de módulos CRUD admin.
 *
 * Elimina ~120 líneas de boilerplate por store al proveer:
 * - Loading, error, dialog visibility signals
 * - CRUD mutations genéricas (add, update, remove)
 * - Paginación server-side
 * - Estadísticas con actualización incremental
 * - Form data con reset
 *
 * @example
 * ```typescript
 * @Injectable({ providedIn: 'root' })
 * export class CursosStore extends BaseCrudStore<Curso, CursoFormData, CursosEstadisticas> {
 *   constructor() {
 *     super({ nombre: '', estado: true }); // default form data
 *   }
 *   protected override getDefaultFormData(): CursoFormData {
 *     return { nombre: '', estado: true };
 *   }
 *   // Solo lógica específica de cursos...
 * }
 * ```
 *
 * @typeParam T - Tipo de la entidad (debe tener `id: number`)
 * @typeParam TForm - Shape del formulario del dialog
 * @typeParam TStats - Shape de las estadísticas (campos numéricos para incremento)
 */
@Injectable()
export abstract class BaseCrudStore<
	T extends HasId,
	TForm = Record<string, unknown>,
	TStats = Record<string, unknown>,
> implements PaginationSignals
{
	// #region Estado privado — Core
	private readonly _items = signal<T[]>([]);
	private readonly _loading = signal(false);
	private readonly _error = signal<string | null>(null);
	private readonly _selectedItem = signal<T | null>(null);
	private readonly _isEditing = signal(false);
	private readonly _formData: WritableSignal<TForm>;
	private readonly _estadisticas: WritableSignal<TStats | null>;
	// #endregion

	// #region Estado privado — UI
	private readonly _dialogVisible = signal(false);
	private readonly _confirmDialogVisible = signal(false);
	// #endregion

	// #region Estado privado — Pagination
	private readonly _page = signal(1);
	private readonly _pageSize = signal(10);
	private readonly _totalRecords = signal(0);
	// #endregion

	// #region Estado privado — Filtros base
	private readonly _searchTerm = signal('');
	private readonly _filterEstado = signal<boolean | number | null>(null);
	// #endregion

	// #region Lecturas públicas
	readonly items = this._items.asReadonly();
	readonly loading = this._loading.asReadonly();
	readonly error = this._error.asReadonly();
	readonly selectedItem = this._selectedItem.asReadonly();
	readonly isEditing = this._isEditing.asReadonly();
	readonly formData: Signal<TForm>;
	readonly estadisticas: Signal<TStats | null>;
	readonly dialogVisible = this._dialogVisible.asReadonly();
	readonly confirmDialogVisible = this._confirmDialogVisible.asReadonly();
	readonly page = this._page.asReadonly();
	readonly pageSize = this._pageSize.asReadonly();
	readonly totalRecords = this._totalRecords.asReadonly();
	readonly searchTerm = this._searchTerm.asReadonly();
	readonly filterEstado = this._filterEstado.asReadonly();
	// #endregion

	// #region Computed base
	readonly isEmpty = computed(() => this._items().length === 0);
	readonly itemCount = computed(() => this._items().length);
	// #endregion

	constructor(
		defaultFormData: TForm,
		defaultStats: TStats | null = null,
	) {
		this._formData = signal<TForm>(defaultFormData);
		this._estadisticas = signal<TStats | null>(defaultStats);
		this.formData = this._formData.asReadonly();
		this.estadisticas = this._estadisticas.asReadonly();
	}

	/** Retorna el form data inicial para resetear al cerrar dialog */
	protected abstract getDefaultFormData(): TForm;

	// #region Comandos — Items
	setItems(items: T[]): void {
		this._items.set(items);
	}

	addItem(item: T): void {
		this._items.update((list) => [item, ...list]);
	}

	/** Mutación quirúrgica: actualiza solo el item con el id dado */
	updateItem(id: number, updates: Partial<T>): void {
		this._items.update((list) =>
			list.map((item) => (item.id === id ? { ...item, ...updates } : item)),
		);
	}

	removeItem(id: number): void {
		this._items.update((list) => list.filter((item) => item.id !== id));
	}
	// #endregion

	// #region Comandos — Loading / Error
	setLoading(loading: boolean): void {
		this._loading.set(loading);
	}

	setError(error: string | null): void {
		this._error.set(error);
	}

	clearError(): void {
		this._error.set(null);
	}
	// #endregion

	// #region Comandos — Dialog
	openDialog(): void {
		this._dialogVisible.set(true);
	}

	closeDialog(): void {
		this._dialogVisible.set(false);
		this._selectedItem.set(null);
		this._isEditing.set(false);
		this.resetFormData();
	}

	openConfirmDialog(): void {
		this._confirmDialogVisible.set(true);
	}

	closeConfirmDialog(): void {
		this._confirmDialogVisible.set(false);
	}
	// #endregion

	// #region Comandos — Form
	setSelectedItem(item: T | null): void {
		this._selectedItem.set(item);
	}

	setFormData(data: TForm): void {
		this._formData.set(data);
	}

	setIsEditing(editing: boolean): void {
		this._isEditing.set(editing);
	}

	updateFormField<K extends keyof TForm>(field: K, value: TForm[K]): void {
		this._formData.update((current) => ({ ...current, [field]: value }));
	}

	resetFormData(): void {
		this._formData.set(this.getDefaultFormData());
	}
	// #endregion

	// #region Comandos — Pagination
	setPaginationData(page: number, pageSize: number, total: number): void {
		this._page.set(page);
		this._pageSize.set(pageSize);
		this._totalRecords.set(total);
	}

	setPage(page: number): void {
		this._page.set(page);
	}

	setPageSize(pageSize: number): void {
		this._pageSize.set(pageSize);
	}
	// #endregion

	// #region Comandos — Stats
	setEstadisticas(stats: TStats): void {
		this._estadisticas.set(stats);
	}

	/**
	 * Incrementa un campo numérico de las estadísticas sin refetch.
	 * Usa Math.max(0, ...) para evitar valores negativos.
	 */
	incrementarEstadistica(campo: keyof TStats, delta: number): void {
		this._estadisticas.update((stats) => {
			if (!stats) return stats;
			const current = stats[campo];
			if (typeof current !== 'number') return stats;
			return { ...stats, [campo]: Math.max(0, current + delta) };
		});
	}
	// #endregion

	// #region Comandos — Filtros base
	setSearchTerm(term: string): void {
		this._searchTerm.set(term);
	}

	setFilterEstado(estado: boolean | number | null): void {
		this._filterEstado.set(estado);
	}

	clearFiltros(): void {
		this._searchTerm.set('');
		this._filterEstado.set(null);
		this._page.set(1);
		this.onClearFiltros();
	}

	/** Override para limpiar filtros adicionales específicos del feature */
	protected onClearFiltros(): void {
		// Default: no-op. Override en stores concretos.
	}
	// #endregion
}
