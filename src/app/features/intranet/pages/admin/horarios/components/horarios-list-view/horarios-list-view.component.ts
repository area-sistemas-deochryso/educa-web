import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import type { HorarioResponseDto } from '../../models/horario.interface';

@Component({
	selector: 'app-horarios-list-view',
	standalone: true,
	imports: [CommonModule, ButtonModule, TableModule, TagModule, TooltipModule],
	templateUrl: './horarios-list-view.component.html',
	styleUrl: './horarios-list-view.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HorariosListViewComponent {
	// ============ Inputs ============
	readonly horarios = input.required<HorarioResponseDto[]>();
	readonly loading = input<boolean>(false);

	// ============ Outputs ============
	readonly viewDetail = output<number>();
	readonly edit = output<number>();
	readonly toggleEstado = output<{ id: number; estadoActual: boolean }>();
	readonly delete = output<number>();

	// ============ Event handlers ============
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

	// ============ TrackBy ============
	trackByHorarioId(_index: number, horario: HorarioResponseDto): number {
		return horario.id;
	}
}
