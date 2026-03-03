import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { CursoContenidoSemanaDto } from '../../../models';

@Component({
	selector: 'app-tareas-summary-dialog',
	standalone: true,
	imports: [CommonModule, DialogModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './tareas-summary-dialog.component.html',
	styleUrl: './tareas-summary-dialog.component.scss',
})
export class TareasSummaryDialogComponent {
	readonly visible = input<boolean>(false);
	readonly semanas = input<CursoContenidoSemanaDto[]>([]);
	readonly visibleChange = output<boolean>();

	readonly isEmpty = computed(() => this.semanas().every((s) => s.tareas.length === 0));

	onVisibleChange(value: boolean): void {
		if (!value) {
			this.visibleChange.emit(false);
		}
	}

	isOverdue(fechaLimite: string | null): boolean {
		if (!fechaLimite) return false;
		return new Date(fechaLimite) < new Date();
	}
}
