import { ChangeDetectionStrategy, Component, OnInit, ViewChild, computed, inject, output, signal } from '@angular/core';
import { forkJoin, finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef } from '@angular/core';

import { TabsModule } from 'primeng/tabs';

import { AttendanceService, SalonProfesor } from '@core/services';
import { ViewMode } from '@features/intranet/components/attendance/attendance-header/attendance-header.component';

import { AttendanceProfesorPropiaComponent } from './propia/attendance-profesor-propia.component';
import { AttendanceProfesorEstudiantesComponent } from './estudiantes/attendance-profesor-estudiantes.component';

/**
 * Shell del panel de asistencia para el rol Profesor (Plan 21 Chat 4).
 *
 * Arma dos pestañas:
 * - "Mi asistencia" (self-service): siempre visible.
 * - "Mis estudiantes" (tutor/docente): visible solo si el profesor tiene
 *   salones asignados (como tutor o vía horario).
 *
 * El shell mantiene el contrato `setViewMode` / `reload` usado por el
 * componente padre `AttendanceComponent` vía ViewChild. La delegación se
 * hace al tab activo.
 */
@Component({
	selector: 'app-attendance-profesor',
	standalone: true,
	imports: [TabsModule, AttendanceProfesorPropiaComponent, AttendanceProfesorEstudiantesComponent],
	templateUrl: './attendance-profesor.component.html',
	styleUrl: './attendance-profesor.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceProfesorComponent implements OnInit {
	private readonly asistenciaService = inject(AttendanceService);
	private readonly destroyRef = inject(DestroyRef);

	@ViewChild(AttendanceProfesorEstudiantesComponent)
	private estudiantesComponent?: AttendanceProfesorEstudiantesComponent;

	@ViewChild(AttendanceProfesorPropiaComponent)
	private propiaComponent?: AttendanceProfesorPropiaComponent;

	// #region Detección de salones del profesor

	/**
	 * Salones del profesor (tutor + horario). Null mientras no cargan.
	 * Si está vacío, la pestaña "Mis estudiantes" se oculta.
	 */
	private readonly salonesProfesor = signal<SalonProfesor[] | null>(null);

	/**
	 * true si el profesor tiene al menos un salón asignado.
	 * Se muestra la pestaña "Mis estudiantes" solo en ese caso.
	 */
	readonly hasSalones = computed(() => {
		const salones = this.salonesProfesor();
		return salones !== null && salones.length > 0;
	});

	readonly salonesReady = computed(() => this.salonesProfesor() !== null);

	// #endregion
	// #region Tabs

	/**
	 * Tab activo.
	 * - Default: 'propia' (el profesor abre primero su propia asistencia).
	 * - Si no tiene salones, permanece en 'propia' (la otra tab está oculta).
	 */
	readonly activeTab = signal<'propia' | 'estudiantes'>('propia');

	/**
	 * Emite true cuando la tab activa requiere el pill día/mes del header
	 * cross-role (tab "Mis estudiantes"), false cuando no aplica (tab
	 * "Mi asistencia" — vista mensual pura idéntica a la del estudiante).
	 */
	readonly showModeSelectorChange = output<boolean>();

	onTabChange(value: string): void {
		if (value === 'propia' || value === 'estudiantes') {
			this.activeTab.set(value);
			this.showModeSelectorChange.emit(value === 'estudiantes');
		}
	}

	// #endregion
	// #region Ciclo de vida

	constructor() {
		this.loadSalonesProfesor();
	}

	ngOnInit(): void {
		// * Emitir el estado inicial del pill: tab default es 'propia' → no aplica.
		this.showModeSelectorChange.emit(false);
	}

	/**
	 * Carga los salones del profesor autenticado para decidir si mostrar
	 * la pestaña "Mis estudiantes". Usa los mismos endpoints que la vista
	 * estudiantes — el resultado queda cacheado por el SW (SWR) y el tab
	 * estudiantes lo consume de cache cuando se monte.
	 */
	private loadSalonesProfesor(): void {
		forkJoin({
			tutoria: this.asistenciaService.getSalonesProfesor(),
			horario: this.asistenciaService.getSalonesProfesorPorHorario(),
		})
			.pipe(
				takeUntilDestroyed(this.destroyRef),
				finalize(() => {
					if (this.salonesProfesor() === null) {
						// Marcar como cargado aunque haya fallado para no bloquear la UI
						this.salonesProfesor.set([]);
					}
				}),
			)
			.subscribe({
				next: ({ tutoria, horario }) => {
					const existingIds = new Set(tutoria.map((s) => s.salonId));
					const merged = [...tutoria];
					for (const salon of horario) {
						if (!existingIds.has(salon.salonId)) merged.push(salon);
					}
					this.salonesProfesor.set(merged);
				},
				error: () => this.salonesProfesor.set([]),
			});
	}

	// #endregion
	// #region Delegados al padre (AttendanceComponent via @ViewChild)

	/**
	 * Delega el cambio de modo día/mes al tab activo.
	 * - Tab "Mi asistencia" NO responde al pill (vista mensual pura, igual que
	 *   la vista del estudiante viendo su propia asistencia).
	 * - Tab "Mis estudiantes" delega al sub-componente.
	 */
	setViewMode(mode: ViewMode): void {
		if (this.activeTab() === 'estudiantes') {
			this.estudiantesComponent?.setViewMode(mode);
		}
	}

	/**
	 * Delega el reload al tab activo.
	 */
	reload(): void {
		if (this.activeTab() === 'propia') {
			this.propiaComponent?.reload();
		} else {
			this.estudiantesComponent?.reload();
		}
	}

	/**
	 * Pre-selecciona un salón desde query param (navegación desde horarios).
	 * Requiere cambiar a la tab de estudiantes primero.
	 */
	selectSalonFromQueryParam(salonId: number): void {
		this.activeTab.set('estudiantes');
		// * queueMicrotask asegura que el ViewChild esté disponible tras el cambio de tab.
		queueMicrotask(() => {
			this.estudiantesComponent?.selectSalonFromQueryParam(salonId);
		});
	}

	// #endregion
}
