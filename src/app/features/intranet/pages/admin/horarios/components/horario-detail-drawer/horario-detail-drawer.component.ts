// #region Imports
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BadgeModule } from 'primeng/badge';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import type { HorarioDetalleResponseDto } from '../../models/horario.interface';
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
	],
	templateUrl: './horario-detail-drawer.component.html',
	styleUrl: './horario-detail-drawer.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HorarioDetailDrawerComponent {
	// * Inputs for drawer state + detail payload.
	readonly visible = input<boolean>(false);
	readonly detalle = input<HorarioDetalleResponseDto | null>(null);
	readonly loading = input<boolean>(false);
	readonly profesoresOptions = input<ProfesorOption[]>([]);

	// * Outputs for actions in the drawer.
	readonly visibleChange = output<boolean>();
	readonly close = output<void>();
	readonly edit = output<number>();
	readonly delete = output<number>();
	readonly toggleEstado = output<{ id: number; estadoActual: boolean }>();
	readonly asignarProfesor = output<{ horarioId: number; profesorId: number }>();
	readonly asignarTodosEstudiantes = output<number>();

	// * Local state for profesor assignment dropdown.
	selectedProfesorId: number | null = null;

	// * Event handlers
	onVisibleChange(visible: boolean): void {
		if (!visible) {
			this.visibleChange.emit(false);
			this.close.emit();
			this.selectedProfesorId = null;
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
		}
	}

	onAsignarTodosEstudiantes(): void {
		const detalle = this.detalle();
		if (detalle) {
			this.asignarTodosEstudiantes.emit(detalle.id);
		}
	}

	// * Helpers
	getEstadoSeverity(estado: boolean): 'success' | 'danger' {
		return estado ? 'success' : 'danger';
	}

	getEstadoLabel(estado: boolean): string {
		return estado ? 'Activo' : 'Inactivo';
	}

	hasEstudiantes(): boolean {
		const detalle = this.detalle();
		return detalle ? detalle.estudiantes.length > 0 : false;
	}

	trackByEstudianteId(_index: number, estudiante: { id: number; nombreCompleto: string }): number {
		return estudiante.id;
	}
}
// #endregion
