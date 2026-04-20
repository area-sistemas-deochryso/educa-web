import { ChangeDetectionStrategy, Component, ViewChild, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectButton } from 'primeng/selectbutton';

import { ViewMode } from '@features/intranet/components/attendance/attendance-header/attendance-header.component';

import { AttendanceDirectorEstudiantesComponent } from './estudiantes/attendance-director-estudiantes.component';
import { AttendanceDirectorProfesoresComponent } from './profesores/attendance-director-profesores.component';

/**
 * Shell del panel admin de asistencia (Director + 3 administrativos no-Director).
 * Expone un submenú Estudiantes/Profesores (Plan 21 Chat 3) que delega la lógica
 * a dos componentes hermanos especializados.
 */
type SubMenu = 'estudiantes' | 'profesores';

const SUBMENU_OPTIONS: { label: string; value: SubMenu; icon: string }[] = [
	{ label: 'Estudiantes', value: 'estudiantes', icon: 'pi pi-graduation-cap' },
	{ label: 'Profesores', value: 'profesores', icon: 'pi pi-user' },
];

@Component({
	selector: 'app-attendance-director',
	standalone: true,
	imports: [
		SelectButton,
		FormsModule,
		AttendanceDirectorEstudiantesComponent,
		AttendanceDirectorProfesoresComponent,
	],
	templateUrl: './attendance-director.component.html',
	styleUrl: './attendance-director.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceDirectorComponent {
	@ViewChild(AttendanceDirectorEstudiantesComponent)
	estudiantesComponent?: AttendanceDirectorEstudiantesComponent;

	// * El submenú por defecto muestra Estudiantes para preservar el flujo actual.
	readonly selectedSubMenu = signal<SubMenu>('estudiantes');
	readonly submenuOptions = SUBMENU_OPTIONS;

	// * Cache del último modo recibido para reaplicarlo al volver a Estudiantes.
	private pendingViewMode: ViewMode | null = null;

	setSubMenu(sub: SubMenu): void {
		this.selectedSubMenu.set(sub);
	}

	/**
	 * Delega `setViewMode` al sub-componente activo.
	 * Solo "Estudiantes" soporta el toggle Día/Mes del header — Profesores tiene
	 * su propio switch interno.
	 */
	setViewMode(mode: ViewMode): void {
		this.pendingViewMode = mode;
		if (this.selectedSubMenu() === 'estudiantes' && this.estudiantesComponent) {
			this.estudiantesComponent.setViewMode(mode);
		}
	}

	/**
	 * Delega reload al sub-componente activo. Profesores no reutiliza el botón
	 * global del header porque su refresh se controla desde la barra de filtros.
	 */
	reload(): void {
		if (this.selectedSubMenu() === 'estudiantes') {
			this.estudiantesComponent?.reload();
		}
	}

	// * Re-aplica cambios de modo pendientes al renderizar Estudiantes.
	onEstudiantesRendered(): void {
		if (this.pendingViewMode && this.estudiantesComponent) {
			this.estudiantesComponent.setViewMode(this.pendingViewMode);
		}
	}
}

// Re-export del helper para que imports relativos desde el directorio sigan funcionando.
export type { TipoReporte, TipoReporteGroup } from './consolidated-pdf.helper';
