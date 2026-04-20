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
 *
 * Tras Plan 21 Chat 7, ambos sub-componentes responden al pill día/mes del header
 * cross-role — `setViewMode` y `reload` se delegan al componente activo.
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

	@ViewChild(AttendanceDirectorProfesoresComponent)
	profesoresComponent?: AttendanceDirectorProfesoresComponent;

	readonly selectedSubMenu = signal<SubMenu>('estudiantes');
	readonly submenuOptions = SUBMENU_OPTIONS;

	// * Cache del último modo recibido del header — se reaplica al cambiar de submenú
	//   para que el sub-componente recién montado respete la elección día/mes del usuario.
	private pendingViewMode: ViewMode | null = null;

	setSubMenu(sub: SubMenu): void {
		if (this.selectedSubMenu() === sub) return;
		this.selectedSubMenu.set(sub);
		// El @switch del template destruye y crea el sub-componente. El ViewChild solo
		// estará disponible después del próximo ciclo de render — usamos setTimeout
		// para aplicar el mode pendiente entonces.
		setTimeout(() => this.applyPendingViewMode(), 0);
	}

	/**
	 * Delega `setViewMode` al sub-componente activo. Ambos soportan el toggle Día/Mes
	 * del header desde Chat 7.
	 */
	setViewMode(mode: ViewMode): void {
		this.pendingViewMode = mode;
		this.applyPendingViewMode();
	}

	reload(): void {
		if (this.selectedSubMenu() === 'estudiantes') {
			this.estudiantesComponent?.reload();
		} else {
			this.profesoresComponent?.reload();
		}
	}

	private applyPendingViewMode(): void {
		const mode = this.pendingViewMode;
		if (!mode) return;
		if (this.selectedSubMenu() === 'estudiantes') {
			this.estudiantesComponent?.setViewMode(mode);
		} else {
			this.profesoresComponent?.setViewMode(mode);
		}
	}
}

// Re-export del helper para que imports relativos desde el directorio sigan funcionando.
export type { TipoReporte, TipoReporteGroup } from './consolidated-pdf.helper';
