import { ChangeDetectionStrategy, Component, ViewChild, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectButton } from 'primeng/selectbutton';

import { ViewMode } from '@features/intranet/components/attendance/attendance-header/attendance-header.component';

import { AttendanceDirectorAsistentesAdminComponent } from './asistentes-admin/attendance-director-asistentes-admin.component';
import { AttendanceDirectorEstudiantesComponent } from './estudiantes/attendance-director-estudiantes.component';
import { AttendanceDirectorProfesoresComponent } from './profesores/attendance-director-profesores.component';
import { AttendanceDirectorStaffComponent } from './staff/attendance-director-staff.component';
import { AttendanceDashboardComponent } from '@features/intranet/components/attendance/attendance-dashboard/attendance-dashboard.component';

/**
 * Shell del panel admin de asistencia (Director + Promotor + Coordinador Académico
 * tras Plan 28 Chat 4a — el Asistente Administrativo va a self-service propia,
 * no a este panel). Expone un submenú Estudiantes/Profesores/AsistentesAdmin que
 * delega la lógica a tres componentes hermanos especializados.
 *
 * Tras Plan 21 Chat 7 + Plan 28 Chat 4b-tab, los tres sub-componentes responden
 * al pill día/mes del header cross-role (mes degradado en AAs hasta endpoint BE).
 */
type SubMenu = 'estudiantes' | 'profesores' | 'asistentes-admin' | 'coordinadores' | 'promotores' | 'directores';

const SUBMENU_OPTIONS: { label: string; value: SubMenu; icon: string }[] = [
	{ label: 'Estudiantes', value: 'estudiantes', icon: 'pi pi-graduation-cap' },
	{ label: 'Profesores', value: 'profesores', icon: 'pi pi-user' },
	{ label: 'Asistentes Admin', value: 'asistentes-admin', icon: 'pi pi-id-card' },
	{ label: 'Coordinadores', value: 'coordinadores', icon: 'pi pi-briefcase' },
	{ label: 'Promotores', value: 'promotores', icon: 'pi pi-megaphone' },
	{ label: 'Directores', value: 'directores', icon: 'pi pi-building' },
];

@Component({
	selector: 'app-attendance-director',
	standalone: true,
	imports: [
		SelectButton,
		FormsModule,
		AttendanceDirectorEstudiantesComponent,
		AttendanceDirectorProfesoresComponent,
		AttendanceDirectorAsistentesAdminComponent,
		AttendanceDirectorStaffComponent,
		AttendanceDashboardComponent,
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

	@ViewChild(AttendanceDirectorAsistentesAdminComponent)
	asistentesAdminComponent?: AttendanceDirectorAsistentesAdminComponent;

	@ViewChild('coordinadoresStaff')
	coordinadoresComponent?: AttendanceDirectorStaffComponent;

	@ViewChild('promotoresStaff')
	promotoresComponent?: AttendanceDirectorStaffComponent;

	@ViewChild('directoresStaff')
	directoresComponent?: AttendanceDirectorStaffComponent;

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
		switch (this.selectedSubMenu()) {
			case 'estudiantes':
				this.estudiantesComponent?.reload();
				break;
			case 'profesores':
				this.profesoresComponent?.reload();
				break;
			case 'asistentes-admin':
				this.asistentesAdminComponent?.reload();
				break;
			case 'coordinadores':
				this.coordinadoresComponent?.reload();
				break;
			case 'promotores':
				this.promotoresComponent?.reload();
				break;
			case 'directores':
				this.directoresComponent?.reload();
				break;
		}
	}

	private applyPendingViewMode(): void {
		const mode = this.pendingViewMode;
		if (!mode) return;
		switch (this.selectedSubMenu()) {
			case 'estudiantes':
				this.estudiantesComponent?.setViewMode(mode);
				break;
			case 'profesores':
				this.profesoresComponent?.setViewMode(mode);
				break;
			case 'asistentes-admin':
				this.asistentesAdminComponent?.setViewMode(mode);
				break;
			case 'coordinadores':
				this.coordinadoresComponent?.setViewMode(mode);
				break;
			case 'promotores':
				this.promotoresComponent?.setViewMode(mode);
				break;
			case 'directores':
				this.directoresComponent?.setViewMode(mode);
				break;
		}
	}
}

// Re-export del helper para que imports relativos desde el directorio sigan funcionando.
export type { TipoReporte, TipoReporteGroup } from './consolidated-pdf.helper';
