import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output,
	signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { ButtonModule } from 'primeng/button';

import {
	CdkDrag,
	CdkDragDrop,
	CdkDropList,
} from '@intranet-shared/directives/drag-drop';

import { ErrorGroupCardComponent } from '../error-group-card';
import {
	ERROR_GROUP_ESTADOS,
	ESTADO_LABEL_MAP,
	ESTADO_TRANSITIONS_MAP,
	ErrorGroupEstado,
	ErrorGroupLista,
} from '../../models';

interface KanbanColumn {
	estado: ErrorGroupEstado;
	label: string;
	icon: string;
	allItems: ErrorGroupLista[];
	visibleItems: ErrorGroupLista[];
	hasMore: boolean;
}

const COLUMN_ICON_MAP: Record<ErrorGroupEstado, string> = {
	NUEVO: 'pi pi-circle-fill',
	VISTO: 'pi pi-eye',
	EN_PROGRESO: 'pi pi-spin pi-spinner',
	RESUELTO: 'pi pi-check-circle',
	IGNORADO: 'pi pi-ban',
};

const INITIAL_PAGE_SIZE = 20;
const PAGE_SIZE_INCREMENT = 20;

/**
 * Smart container del Kanban de error-groups. Recibe la lista visible (ya
 * filtrada por search/severidad/origen del store) y la distribuye entre 5
 * columnas por estado, ordenadas por `ultimaFecha DESC`. Cada columna pagina
 * client-side con "Cargar más".
 *
 * El drag-drop usa CDK con `cdkDropListEnterPredicate` que mira la matriz
 * `ESTADO_TRANSITIONS_MAP` (defensa en profundidad — el BE rechaza
 * transiciones inválidas con `ERRORGROUP_TRANSICION_INVALIDA`).
 */
@Component({
	selector: 'app-error-groups-kanban-board',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [
		CommonModule,
		ButtonModule,
		CdkDropList,
		CdkDrag,
		ErrorGroupCardComponent,
	],
	templateUrl: './error-groups-kanban-board.component.html',
	styleUrl: './error-groups-kanban-board.component.scss',
})
export class ErrorGroupsKanbanBoardComponent {
	readonly groups = input.required<ErrorGroupLista[]>();
	readonly hideResolvedIgnored = input(false);

	readonly cardClick = output<ErrorGroupLista>();
	readonly cardDropped = output<{
		group: ErrorGroupLista;
		fromEstado: ErrorGroupEstado;
		toEstado: ErrorGroupEstado;
	}>();

	private readonly _pageSizeByColumn = signal<Map<ErrorGroupEstado, number>>(
		new Map(ERROR_GROUP_ESTADOS.map((e) => [e, INITIAL_PAGE_SIZE])),
	);

	/** Columna desde la que se está arrastrando ahora mismo. `null` si no hay drag activo. */
	readonly draggingFrom = signal<ErrorGroupEstado | null>(null);

	readonly columns = computed<KanbanColumn[]>(() => {
		const all = this.groups();
		const sizes = this._pageSizeByColumn();
		const hide = this.hideResolvedIgnored();

		return ERROR_GROUP_ESTADOS.filter(
			(e) => !(hide && (e === 'RESUELTO' || e === 'IGNORADO')),
		).map((estado) => {
			const allItems = all
				.filter((g) => g.estado === estado)
				.sort((a, b) => b.ultimaFecha.localeCompare(a.ultimaFecha));
			const limit = sizes.get(estado) ?? INITIAL_PAGE_SIZE;
			const visibleItems = allItems.slice(0, limit);
			return {
				estado,
				label: ESTADO_LABEL_MAP[estado],
				icon: COLUMN_ICON_MAP[estado],
				allItems,
				visibleItems,
				hasMore: allItems.length > visibleItems.length,
			};
		});
	});

	readonly dropListIds = computed(() =>
		this.columns().map((c) => `kanban-col-${c.estado}`),
	);

	/** Predicate factory: solo permite drop si la transición está autorizada. */
	dropPredicate = (toEstado: ErrorGroupEstado) => {
		return (drag: CdkDrag<ErrorGroupLista>): boolean => {
			const data = drag.data;
			if (!data) return false;
			return ESTADO_TRANSITIONS_MAP[data.estado].includes(toEstado);
		};
	};

	/** Severidad visual de la columna durante un drag activo. */
	columnDropClass(estado: ErrorGroupEstado): string {
		const from = this.draggingFrom();
		if (!from || from === estado) return '';
		return ESTADO_TRANSITIONS_MAP[from].includes(estado)
			? 'kanban-column--valid-drop'
			: 'kanban-column--invalid-drop';
	}

	onCardClick(group: ErrorGroupLista): void {
		this.cardClick.emit(group);
	}

	onDragStarted(group: ErrorGroupLista): void {
		this.draggingFrom.set(group.estado);
	}

	onDragEnded(): void {
		this.draggingFrom.set(null);
	}

	onDrop(event: CdkDragDrop<unknown>, toEstado: ErrorGroupEstado): void {
		this.draggingFrom.set(null);
		const group = event.item.data as ErrorGroupLista | undefined;
		if (!group) return;
		if (group.estado === toEstado) return;
		if (!ESTADO_TRANSITIONS_MAP[group.estado].includes(toEstado)) return;
		this.cardDropped.emit({ group, fromEstado: group.estado, toEstado });
	}

	onLoadMore(estado: ErrorGroupEstado): void {
		this._pageSizeByColumn.update((map) => {
			const next = new Map(map);
			next.set(estado, (next.get(estado) ?? INITIAL_PAGE_SIZE) + PAGE_SIZE_INCREMENT);
			return next;
		});
	}

	trackByEstado(_index: number, col: KanbanColumn): ErrorGroupEstado {
		return col.estado;
	}

	trackById(_index: number, group: ErrorGroupLista): number {
		return group.id;
	}
}
