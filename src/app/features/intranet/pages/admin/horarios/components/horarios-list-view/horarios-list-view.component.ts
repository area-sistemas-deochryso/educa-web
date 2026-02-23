// #region Imports
import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ButtonModule } from 'primeng/button';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import type { HorarioResponseDto } from '../../models/horario.interface';

// #endregion
// #region Implementation
@Component({
	selector: 'app-horarios-list-view',
	standalone: true,
	imports: [CommonModule, ButtonModule, TableModule, TagModule, TooltipModule],
	templateUrl: './horarios-list-view.component.html',
	styleUrl: './horarios-list-view.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HorariosListViewComponent {
	// * Inputs for list data + loading state.
	readonly horarios = input.required<HorarioResponseDto[]>();
	readonly loading = input<boolean>(false);
	readonly totalRecords = input(0);
	readonly rows = input(10);

	// * Row action outputs.
	readonly viewDetail = output<number>();
	readonly edit = output<number>();
	readonly toggleEstado = output<{ id: number; estadoActual: boolean }>();
	readonly delete = output<number>();
	readonly lazyLoad = output<{ page: number; pageSize: number }>();

	// * Skip first p-table onLazyLoad (fires on init before data loads)
	private initialLoadDone = signal(false);

	// * Event handlers
	onViewDetail(id: number): void {
		this.viewDetail.emit(id);
	}

	onEdit(id: number): void {
		this.edit.emit(id);
	}

	onToggleEstado(id: number, estadoActual: boolean): void {
		this.toggleEstado.emit({ id, estadoActual });
	}

	onDelete(id: number): void {
		this.delete.emit(id);
	}

	onLazyLoad(event: TableLazyLoadEvent): void {
		if (!this.initialLoadDone()) {
			this.initialLoadDone.set(true);
			return;
		}
		const first = event.first ?? 0;
		const rows = event.rows ?? 10;
		const page = Math.floor(first / rows) + 1;
		this.lazyLoad.emit({ page, pageSize: rows });
	}

	// * TrackBy
	trackByHorarioId(_index: number, horario: HorarioResponseDto): number {
		return horario.id;
	}
}
// #endregion
