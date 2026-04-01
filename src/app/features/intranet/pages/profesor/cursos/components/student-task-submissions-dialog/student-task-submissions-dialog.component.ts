import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { EstudianteTareaArchivosGroupDto, CursoContenidoTareaDto } from '../../../models';
import { FormatFileSizePipe } from '@shared/pipes';

@Component({
	selector: 'app-student-task-submissions-dialog',
	standalone: true,
	imports: [CommonModule, DialogModule, ButtonModule, TooltipModule, TagModule, ProgressSpinnerModule, FormatFileSizePipe],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './student-task-submissions-dialog.component.html',
	styleUrl: './student-task-submissions-dialog.component.scss',
})
export class StudentTaskSubmissionsDialogComponent {
	// #region Inputs/Outputs
	readonly visible = input<boolean>(false);
	readonly data = input<EstudianteTareaArchivosGroupDto[]>([]);
	readonly tarea = input<CursoContenidoTareaDto | null>(null);
	readonly loading = input<boolean>(false);
	readonly visibleChange = output<boolean>();
	readonly irACalificaciones = output<void>();
	// #endregion

	// #region Computed
	readonly totalEntregas = computed(() => {
		return this.data().filter((e) => e.archivos.length > 0).length;
	});

	readonly totalEstudiantes = computed(() => this.data().length);

	readonly dialogHeader = computed(() => {
		const t = this.tarea();
		return t ? `Entregas: ${t.titulo}` : 'Entregas de Estudiantes';
	});

	readonly isOverdue = computed(() => {
		const t = this.tarea();
		if (!t?.fechaLimite) return false;
		return new Date(t.fechaLimite) < new Date();
	});
	// #endregion

	// #region Handlers
	onVisibleChange(value: boolean): void {
		if (!value) {
			this.visibleChange.emit(false);
		}
	}

	openArchivo(url: string): void {
		window.open(url, '_blank');
	}

	onIrACalificaciones(): void {
		this.irACalificaciones.emit();
	}
	// #endregion

	// #region Helpers
	getSubmissionStatus(estudiante: EstudianteTareaArchivosGroupDto): {
		label: string;
		severity: 'success' | 'warn' | 'danger' | 'secondary';
		icon: string;
	} {
		if (estudiante.archivos.length === 0) {
			return { label: 'Sin entregar', severity: 'danger', icon: 'pi pi-times-circle' };
		}

		const tarea = this.tarea();
		if (tarea?.fechaLimite) {
			const fechaLimite = new Date(tarea.fechaLimite);
			const ultimaEntrega = new Date(estudiante.archivos[estudiante.archivos.length - 1].fechaReg);
			if (ultimaEntrega > fechaLimite) {
				return { label: 'Entrega tardía', severity: 'warn', icon: 'pi pi-clock' };
			}
		}

		return { label: 'Entregado', severity: 'success', icon: 'pi pi-check-circle' };
	}
	// #endregion
}
