// #region Imports
import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import type { PagosCategoria, QuienDebeFila, QuienesDebenOrden } from '@data/models';
import { EduPaginator, EduTag } from '@edu-ui';
import type { EduPaginatorPageEvent, EduTagSeverity } from '@edu-ui';
import { formatFechaConDia, formatSoles } from '../utils/pagos-format.util';
import { QuienesDebenCuotasComponent } from './quienes-deben-cuotas.component';
// #endregion

interface CategoriaView {
	label: string;
	severity: EduTagSeverity;
	icon: string;
}

const CATEGORIAS: Record<PagosCategoria, CategoriaView> = {
	AlDia: { label: 'Al día', severity: 'success', icon: 'pi pi-check-circle' },
	PagoParcial: { label: 'Pago parcial', severity: 'warn', icon: 'pi pi-exclamation-circle' },
	ConDeuda: { label: 'Con deuda', severity: 'danger', icon: 'pi pi-times-circle' },
};

interface SortableColumn {
	key: QuienesDebenOrden;
	label: string;
	numeric?: boolean;
}

/** Tabla presentacional con orden y paginación del servidor, y detalle de cuotas expandible. */
@Component({
	selector: 'app-quienes-deben-table',
	standalone: true,
	imports: [EduTag, EduPaginator, QuienesDebenCuotasComponent, RouterLink],
	templateUrl: './quienes-deben-table.component.html',
	styleUrl: './quienes-deben-table.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuienesDebenTableComponent {
	readonly filas = input.required<QuienDebeFila[]>();
	readonly total = input(0);
	readonly first = input(0);
	readonly pageSize = input(20);
	readonly orden = input<QuienesDebenOrden | null>(null);
	readonly descendente = input(false);

	readonly sort = output<QuienesDebenOrden>();
	readonly pageChange = output<{ page: number; pageSize: number }>();

	protected readonly expanded = signal<ReadonlySet<number>>(new Set());

	protected readonly columns: SortableColumn[] = [
		{ key: 'estudiante', label: 'Alumno' },
		{ key: 'salon', label: 'Salón' },
		{ key: 'categoria', label: 'Categoría' },
		{ key: 'cuotas', label: 'Cuotas vencidas', numeric: true },
		{ key: 'atraso', label: 'Atraso máx. (días)', numeric: true },
		{ key: 'deuda', label: 'Deuda vencida', numeric: true },
	];

	protected readonly soles = formatSoles;
	protected readonly fecha = formatFechaConDia;

	protected categoria(c: PagosCategoria): CategoriaView {
		return CATEGORIAS[c];
	}

	protected ariaSort(key: QuienesDebenOrden): 'ascending' | 'descending' | 'none' {
		if (this.orden() !== key) return 'none';
		return this.descendente() ? 'descending' : 'ascending';
	}

	protected sortIcon(key: QuienesDebenOrden): string {
		if (this.orden() !== key) return 'pi pi-sort-alt';
		return this.descendente() ? 'pi pi-sort-amount-down' : 'pi pi-sort-amount-up-alt';
	}

	protected toggle(id: number): void {
		this.expanded.update((set) => {
			const next = new Set(set);
			if (!next.delete(id)) next.add(id);
			return next;
		});
	}

	protected onPage(event: EduPaginatorPageEvent): void {
		this.pageChange.emit({ page: Math.floor(event.first / event.rows) + 1, pageSize: event.rows });
	}
}
