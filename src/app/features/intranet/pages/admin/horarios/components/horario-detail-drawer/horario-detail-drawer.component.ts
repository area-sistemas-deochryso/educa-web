// #region Imports
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BadgeModule } from 'primeng/badge';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import type { HorarioDetalleResponseDto, EstudianteHorarioDto } from '../../models/horario.interface';
import { EstadoLabelPipe, EstadoSeverityPipe, EstadoToggleIconPipe, EstadoToggleLabelPipe } from '@shared/pipes';
import type { ProfesorOption } from '../../models/profesor.interface';

// #endregion
// #region Implementation
@Component({
	selector: 'app-horario-detail-drawer',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		BadgeModule,
		ButtonModule,
		DrawerModule,
		SelectModule,
		TagModule,
		TooltipModule,
		EstadoLabelPipe,
		EstadoSeverityPipe,
		EstadoToggleIconPipe,
		EstadoToggleLabelPipe,
	],
	templateUrl: './horario-detail-drawer.component.html',
	styleUrl: './horario-detail-drawer.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HorarioDetailDrawerComponent {
	// #region Inputs
	readonly visible = input<boolean>(false);
	readonly detalle = input<HorarioDetalleResponseDto | null>(null);
	readonly loading = input<boolean>(false);
	readonly profesoresOptions = input<ProfesorOption[]>([]);
	readonly isAdmin = input<boolean>(true);

	// #endregion
	// #region Outputs
	readonly visibleChange = output<boolean>();
	readonly close = output<void>();
	readonly edit = output<number>();
	readonly delete = output<number>();
	readonly toggleEstado = output<{ id: number; estadoActual: boolean }>();
	readonly asignarProfesor = output<{ horarioId: number; profesorId: number }>();
	readonly asignarTodosEstudiantes = output<number>();
	readonly desasignarProfesor = output<number>();
	readonly desasignarEstudiante = output<{ horarioId: number; estudianteId: number }>();

	// #endregion
	// #region Estado local
	selectedProfesorId: number | null = null;
	readonly showProfesorEdit = signal(false);

	// #endregion
	// #region Computed
	readonly hasEstudiantes = computed(() => {
		const detalle = this.detalle();
		return detalle ? detalle.estudiantes.length > 0 : false;
	});

	// #endregion
	// #region Event handlers
	onVisibleChange(visible: boolean): void {
		if (!visible) {
			this.visibleChange.emit(false);
			this.close.emit();
			this.selectedProfesorId = null;
			this.showProfesorEdit.set(false);
		}
	}

	onClose(): void {
		this.close.emit();
	}

	onEdit(): void {
		const detalle = this.detalle();
		if (detalle) {
			this.edit.emit(detalle.id);
		}
	}

	onDelete(): void {
		const detalle = this.detalle();
		if (detalle) {
			this.delete.emit(detalle.id);
		}
	}

	onToggleEstado(): void {
		const detalle = this.detalle();
		if (detalle) {
			this.toggleEstado.emit({
				id: detalle.id,
				estadoActual: detalle.estado,
			});
		}
	}

	onAsignarProfesor(): void {
		const detalle = this.detalle();
		if (detalle && this.selectedProfesorId) {
			this.asignarProfesor.emit({
				horarioId: detalle.id,
				profesorId: this.selectedProfesorId,
			});
			this.selectedProfesorId = null;
			this.showProfesorEdit.set(false);
		}
	}

	onDesasignarProfesor(): void {
		const detalle = this.detalle();
		if (detalle) {
			this.desasignarProfesor.emit(detalle.id);
		}
	}

	onDesasignarEstudiante(estudianteId: number): void {
		const detalle = this.detalle();
		if (detalle) {
			this.desasignarEstudiante.emit({
				horarioId: detalle.id,
				estudianteId,
			});
		}
	}

	onAsignarTodosEstudiantes(): void {
		const detalle = this.detalle();
		if (detalle) {
			this.asignarTodosEstudiantes.emit(detalle.id);
		}
	}

	onToggleProfesorEdit(): void {
		this.showProfesorEdit.update((v) => !v);
		if (!this.showProfesorEdit()) {
			this.selectedProfesorId = null;
		}
	}

	// #endregion
	// #region Helpers
	trackByEstudianteId(_index: number, estudiante: EstudianteHorarioDto): number {
		return estudiante.id;
	}
	// #endregion
}
// #endregion
