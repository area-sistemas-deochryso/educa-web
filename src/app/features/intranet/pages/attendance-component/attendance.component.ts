import {
	AttendanceHeaderComponent,
	ViewMode,
} from '../../components/attendance/attendance-header/attendance-header.component';
import { Component, ViewChild, inject, signal } from '@angular/core';

import { AttendanceApoderadoComponent } from './attendance-apoderado/attendance-apoderado.component';
import { AttendanceDirectorComponent } from './attendance-director/attendance-director.component';
import { AttendanceEstudianteComponent } from './attendance-estudiante/attendance-estudiante.component';
import { AttendanceProfesorComponent } from './attendance-profesor/attendance-profesor.component';
import { Router } from '@angular/router';
import { UserProfileService } from '@core/services';
import { logger } from '@core/helpers';

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
	private router = inject(Router);

	@ViewChild(AttendanceApoderadoComponent) apoderadoComponent?: AttendanceApoderadoComponent;
	@ViewChild(AttendanceProfesorComponent) profesorComponent?: AttendanceProfesorComponent;
	@ViewChild(AttendanceDirectorComponent) directorComponent?: AttendanceDirectorComponent;
	@ViewChild(AttendanceEstudianteComponent) estudianteComponent?: AttendanceEstudianteComponent;

	readonly userRole = this.userProfile.userRole;
	readonly loading = signal(false);
	readonly selectedMode = signal<ViewMode>('dia');

	// Verificar rol válido y redirigir si es inesperado
	constructor() {
		const validRoles = ['Apoderado', 'Profesor', 'Director', 'Asistente Administrativo', 'Estudiante'];
		const currentRole = this.userRole();

		if (currentRole && !validRoles.includes(currentRole)) {
			logger.warn(`Rol inesperado en asistencias: ${currentRole}. Redirigiendo a /intranet`);
			this.router.navigate(['/intranet']);
		}
	}

	// Header común
	onModeChange(mode: ViewMode): void {
		this.selectedMode.set(mode);
		const role = this.userRole();
		if (role === 'Profesor') {
			this.profesorComponent?.setViewMode(mode);
		} else if (role === 'Director' || role === 'Asistente Administrativo') {
			this.directorComponent?.setViewMode(mode);
		}
	}

	onReload(): void {
		const role = this.userRole();
		if (role === 'Apoderado') {
			this.apoderadoComponent?.reload();
		} else if (role === 'Profesor') {
			this.profesorComponent?.reload();
		} else if (role === 'Director' || role === 'Asistente Administrativo') {
			this.directorComponent?.reload();
		} else if (role === 'Estudiante') {
			this.estudianteComponent?.reload();
		}
	}
}
