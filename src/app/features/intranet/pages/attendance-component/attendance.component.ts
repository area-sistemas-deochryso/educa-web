import {
	AttendanceHeaderComponent,
	VIEW_MODE,
	ViewMode,
} from '../../components/attendance/attendance-header/attendance-header.component';
import { Component, ViewChild, inject, signal } from '@angular/core';

import { AttendanceApoderadoComponent } from './attendance-apoderado/attendance-apoderado.component';
import { AttendanceDirectorComponent } from './attendance-director/attendance-director.component';
import { AttendanceEstudianteComponent } from './attendance-estudiante/attendance-estudiante.component';
import { AttendanceProfesorComponent } from './attendance-profesor/attendance-profesor.component';
import { UserProfileService } from '@core/services';
import { APP_USER_ROLES } from '@app/shared/constants';

/**
 * Componente Page/Route para asistencias.
 *
 * Este componente actúa como un router/shell que:
 * 1. Determina el rol del usuario
 * 2. Muestra el header y leyenda compartidos
 * 3. Delega la lógica específica a componentes especializados por rol
 *
 * Taxonomía: Page/Route - Coordina subcomponentes según el contexto (rol del usuario)
 */
@Component({
	selector: 'app-attendance',
	standalone: true,
	imports: [
		AttendanceHeaderComponent,
		AttendanceApoderadoComponent,
		AttendanceProfesorComponent,
		AttendanceDirectorComponent,
		AttendanceEstudianteComponent,
	],
	templateUrl: './attendance.component.html',
	styleUrl: './attendance.component.scss',
})
export class AttendanceComponent {
	private userProfile = inject(UserProfileService);

	// * ViewChild refs are used to delegate reload/mode actions by role.
	@ViewChild(AttendanceApoderadoComponent) apoderadoComponent?: AttendanceApoderadoComponent;
	@ViewChild(AttendanceProfesorComponent) profesorComponent?: AttendanceProfesorComponent;
	@ViewChild(AttendanceDirectorComponent) directorComponent?: AttendanceDirectorComponent;
	@ViewChild(AttendanceEstudianteComponent) estudianteComponent?: AttendanceEstudianteComponent;

	// * Local state mirrors the profile signal to drive header + role switch.
	readonly userRole = this.userProfile.userRole;
	readonly loading = signal(false);
	readonly selectedMode = signal<ViewMode>(VIEW_MODE.Dia);

	// * Header comun: solo algunos roles soportan cambio de modo.
	onModeChange(mode: ViewMode): void {
		this.selectedMode.set(mode);
		const role = this.userRole();
		if (role === APP_USER_ROLES.Profesor) {
			this.profesorComponent?.setViewMode(mode);
		} else if (
			role === APP_USER_ROLES.Director ||
			role === APP_USER_ROLES.AsistenteAdministrativo
		) {
			this.directorComponent?.setViewMode(mode);
		}
	}

	// * Delegar reload al componente activo segun rol.
	onReload(): void {
		const role = this.userRole();
		if (role === APP_USER_ROLES.Apoderado) {
			this.apoderadoComponent?.reload();
		} else if (role === APP_USER_ROLES.Profesor) {
			this.profesorComponent?.reload();
		} else if (
			role === APP_USER_ROLES.Director ||
			role === APP_USER_ROLES.AsistenteAdministrativo
		) {
			this.directorComponent?.reload();
		} else if (role === APP_USER_ROLES.Estudiante) {
			this.estudianteComponent?.reload();
		}
	}
}
