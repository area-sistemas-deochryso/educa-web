// #region Imports
import {
	AttendanceHeaderComponent,
	VIEW_MODE,
	ViewMode,
} from '@features/intranet/components/attendance/attendance-header/attendance-header.component';
import { ChangeDetectionStrategy, Component, ViewChild, AfterViewInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EduButton } from '@edu-ui';

import { AttendanceApoderadoComponent } from './attendance-apoderado/attendance-apoderado.component';
import { AttendanceDirectorComponent } from './attendance-director/attendance-director.component';
import { AttendanceEstudianteComponent } from './attendance-estudiante/attendance-estudiante.component';
import { AttendanceProfesorComponent } from './attendance-profesor/attendance-profesor.component';
import { UserProfileService } from '@core/services';
import { UserPermissionsService } from '@core/services/permissions';
import { ViewAsContextService } from '@core/services/view-as';

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
// #endregion
// #region Implementation
@Component({
	selector: 'app-attendance',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [AttendanceHeaderComponent, AttendanceApoderadoComponent, AttendanceProfesorComponent, AttendanceDirectorComponent, AttendanceEstudianteComponent, EduButton],
	templateUrl: './attendance.component.html',
	styleUrl: './attendance.component.scss',
})
export class AttendanceComponent implements AfterViewInit {
	private userProfile = inject(UserProfileService);
	private route = inject(ActivatedRoute);
	private router = inject(Router);
	private userPermisos = inject(UserPermissionsService);
	private viewAsContext = inject(ViewAsContextService);

	/** Gate del link "Ver Panel Administrativo de Asistencias" — mismo código que gatea el tab Panel en el admin. */
	readonly canViewAdminPanel = computed(() => this.userPermisos.hasCapability('ADMIN_ASISTENCIAS'));

	// * ViewChild refs are used to delegate reload/mode actions by role.
	@ViewChild(AttendanceApoderadoComponent) apoderadoComponent?: AttendanceApoderadoComponent;
	@ViewChild(AttendanceProfesorComponent) profesorComponent?: AttendanceProfesorComponent;
	@ViewChild(AttendanceDirectorComponent) directorComponent?: AttendanceDirectorComponent;
	@ViewChild(AttendanceEstudianteComponent) estudianteComponent?: AttendanceEstudianteComponent;

	// * Local state mirrors the profile signal to drive header + role switch.
	readonly userRole = this.userProfile.userRole;
	readonly loading = signal(false);
	readonly selectedMode = signal<ViewMode>(VIEW_MODE.Dia);

	/** `/intranet/asistencia` es ruta compartida (`ViewAsContextService.SHARED_ROUTES`) — un admin
	 * "viendo como" Profesor/Estudiante debe ver el sub-componente del rol impersonado, no el suyo
	 * real (mismo patrón que `effectiveRol` en `IntranetLayoutComponent`). */
	private readonly isViewingAs = computed(() => !!this.viewAsContext.activeContext());
	readonly effectiveRole = computed(() => this.viewAsContext.activeContext()?.rol ?? this.userRole());

	// * El pill día/mes aplica cuando el usuario mira el panel admin o sus estudiantes.
	//   - Roles de staff (esStaff): siempre aplica (panel director) — solo fuera de "ver como",
	//     porque un admin impersonando nunca debe ver el panel director propio.
	//   - Profesor: solo cuando tab "Mis estudiantes" está activa.
	//   - Estudiante / Apoderado: nunca aplica — vista propia mensual.
	private readonly profesorShowModeSelector = signal(false);
	readonly showModeSelector = computed(() => {
		if (!this.isViewingAs() && this.userProfile.rol()?.esStaff) return true;
		if (this.effectiveRole() === 'Profesor') return this.profesorShowModeSelector();
		return false;
	});

	onProfesorShowModeSelectorChange(show: boolean): void {
		this.profesorShowModeSelector.set(show);
	}

	ngAfterViewInit(): void {
		// Leer salonId de query params (viene desde horarios del profesor)
		const salonIdParam = this.route.snapshot.queryParamMap.get('salonId');
		if (salonIdParam && this.profesorComponent) {
			const salonId = Number(salonIdParam);
			if (!isNaN(salonId)) {
				this.profesorComponent.selectSalonFromQueryParam(salonId);
			}
		}
	}

	// * Header comun: solo algunos roles soportan cambio de modo.
	onModeChange(mode: ViewMode): void {
		this.selectedMode.set(mode);
		if (this.effectiveRole() === 'Profesor') {
			this.profesorComponent?.setViewMode(mode);
		} else if (!this.isViewingAs() && this.userProfile.rol()?.esStaff) {
			this.directorComponent?.setViewMode(mode);
		}
	}

	// * Delegar reload al componente activo segun rol.
	onReload(): void {
		const role = this.effectiveRole();
		if (role === 'Apoderado') {
			this.apoderadoComponent?.reload();
		} else if (role === 'Profesor') {
			this.profesorComponent?.reload();
		} else if (!this.isViewingAs() && this.userProfile.rol()?.esStaff) {
			this.directorComponent?.reload();
		} else if (role === 'Estudiante') {
			this.estudianteComponent?.reload();
		}
	}

	/** Drill-down al panel administrativo de asistencias (solo visible con `ADMIN_ASISTENCIAS`). */
	irAPanelAdmin(): void {
		void this.router.navigate(['/intranet/admin/asistencias'], { queryParams: { tab: 'panel' } });
	}
}
// #endregion
