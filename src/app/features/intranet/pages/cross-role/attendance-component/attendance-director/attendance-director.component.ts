import { ChangeDetectionStrategy, Component, computed, ViewChild, signal } from '@angular/core';

import { ViewMode } from '@features/intranet/components/attendance/attendance-header/attendance-header.component';
import { TipoPersona } from '@data/models';

import { AttendanceDirectorAsistentesAdminComponent } from './asistentes-admin/attendance-director-asistentes-admin.component';
import { AttendanceDirectorEstudiantesComponent } from './estudiantes/attendance-director-estudiantes.component';
import { AttendanceDirectorProfesoresComponent } from './profesores/attendance-director-profesores.component';
import { AttendanceDirectorStaffComponent } from './staff/attendance-director-staff.component';
import { AttendanceDashboardComponent } from '@features/intranet/components/attendance/attendance-dashboard/attendance-dashboard.component';

type SubMenu = 'estudiantes' | 'profesores' | 'asistentes-admin' | 'coordinadores' | 'promotores' | 'directores' | 'administradores';

const TIPO_TO_SUBMENU: Record<TipoPersona, SubMenu> = {
	E: 'estudiantes',
	P: 'profesores',
	A: 'asistentes-admin',
	C: 'coordinadores',
	M: 'promotores',
	D: 'directores',
	N: 'administradores',
};

const SUBMENU_TO_TIPO: Record<SubMenu, TipoPersona> = {
	'estudiantes': 'E',
	'profesores': 'P',
	'asistentes-admin': 'A',
	'coordinadores': 'C',
	'promotores': 'M',
	'directores': 'D',
	'administradores': 'N',
};

@Component({
	selector: 'app-attendance-director',
	standalone: true,
	imports: [
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

	@ViewChild('administradoresStaff')
	administradoresComponent?: AttendanceDirectorStaffComponent;

	readonly selectedSubMenu = signal<SubMenu>('estudiantes');
	readonly selectedRoleTipo = computed<TipoPersona>(() => SUBMENU_TO_TIPO[this.selectedSubMenu()]);
	readonly currentViewMode = signal<ViewMode>('dia');

	private pendingViewMode: ViewMode | null = null;

	setSubMenu(sub: SubMenu): void {
		if (this.selectedSubMenu() === sub) return;
		this.selectedSubMenu.set(sub);
		setTimeout(() => this.applyPendingViewMode(), 0);
	}

	onRoleSelect(tipo: TipoPersona): void {
		const sub = TIPO_TO_SUBMENU[tipo];
		if (sub) this.setSubMenu(sub);
	}

	setViewMode(mode: ViewMode): void {
		this.currentViewMode.set(mode);
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
			case 'administradores':
				this.administradoresComponent?.reload();
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
			case 'administradores':
				this.administradoresComponent?.setViewMode(mode);
				break;
		}
	}
}

// Re-export del helper para que imports relativos desde el directorio sigan funcionando.
export type { TipoReporte, TipoReporteGroup } from './consolidated-pdf.helper';
