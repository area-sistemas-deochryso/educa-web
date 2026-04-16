import { Component, ChangeDetectionStrategy, input, output, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { DialogModule } from 'primeng/dialog';
import { TabsModule } from 'primeng/tabs';
import { ButtonModule } from 'primeng/button';

import { EstudianteAsistencia } from '@shared/services/attendance';
import { HorarioResponseDto, SalonNotasResumenDto, resolveModoAsignacion } from '@data/models';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import {
	SalonAdminListDto,
	AprobacionEstudianteListDto,
	AprobarEstudianteDto,
	AprobacionMasivaDto,
} from '../../models';
import { ClassroomApprovalTabComponent } from '../salon-aprobacion-tab/salon-aprobacion-tab.component';
import { ClassroomAttendanceTabComponent } from '../salon-attendance-tab/salon-attendance-tab.component';
import { ClassroomGradesTabComponent } from '../salon-notas-tab/salon-notas-tab.component';

@Component({
	selector: 'app-classroom-detail-dialog',
	standalone: true,
	imports: [
		CommonModule,
		DialogModule,
		TabsModule,
		ButtonModule,
		TagModule,
		TooltipModule,
		ClassroomApprovalTabComponent,
		ClassroomAttendanceTabComponent,
		ClassroomGradesTabComponent,
	],
	templateUrl: './salon-detail-dialog.component.html',
	styleUrl: './salon-detail-dialog.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClassroomDetailDialogComponent {
	// #region Inputs — visibilidad y datos principales
	readonly visible = input(false);
	readonly salon = input<SalonAdminListDto | null>(null);
	readonly periodoId = input<number | null>(null);
	readonly periodoCerrado = input(false);
	// #endregion

	// #region Inputs — aprobación
	readonly aprobaciones = input<AprobacionEstudianteListDto[]>([]);
	readonly aprobacionesLoading = input(false);
	// #endregion

	// #region Inputs — asistencia
	readonly asistenciaData = input<EstudianteAsistencia[]>([]);
	readonly asistenciaLoading = input(false);
	// #endregion

	// #region Inputs — notas
	readonly notasData = input<SalonNotasResumenDto | null>(null);
	readonly notasLoading = input(false);
	readonly horarios = input<HorarioResponseDto[]>([]);
	readonly horariosLoading = input(false);
	// #endregion

	// #region Outputs
	readonly visibleChange = output<boolean>();
	readonly aprobar = output<AprobarEstudianteDto>();
	readonly aprobarMasivo = output<AprobacionMasivaDto>();
	readonly loadAsistencia = output<{ grado: string; seccion: string; mes: number; anio: number }>();
	readonly loadNotas = output<{ salonId: number; cursoId: number }>();
	// #endregion

	// #region Estado local
	readonly isFullscreen = signal(false);
	private asistenciaLoaded = false;
	// #endregion

	// #region Computed
	readonly salonDescripcion = computed(() => {
		const s = this.salon();
		return s ? `${s.grado} ${s.seccion} — ${s.sede}` : 'Salón';
	});

	readonly modoAsignacion = computed(() => {
		const s = this.salon();
		if (!s) return null;
		return resolveModoAsignacion(s.gradoOrden, s.seccion);
	});

	readonly modoLabel = computed(() => {
		const modo = this.modoAsignacion();
		if (modo === 'TutorPleno') return 'Tutor pleno';
		if (modo === 'PorCurso') return 'Por curso';
		if (modo === 'Flexible') return 'Flexible';
		return null;
	});

	readonly modoSeverity = computed<'info' | 'warn' | 'secondary'>(() => {
		const modo = this.modoAsignacion();
		if (modo === 'TutorPleno') return 'info';
		if (modo === 'PorCurso') return 'warn';
		return 'secondary';
	});

	readonly modoTooltip = computed(() => {
		const modo = this.modoAsignacion();
		if (modo === 'TutorPleno') return 'El tutor dicta todos los cursos';
		if (modo === 'PorCurso') return 'Cada curso tiene un profesor asignado';
		if (modo === 'Flexible') return 'Sección vacacional: sin restricciones';
		return '';
	});

	readonly dialogStyle = computed(() =>
		this.isFullscreen()
			? { width: '100vw', maxWidth: '100vw', height: '100vh', maxHeight: '100vh' }
			: { width: '900px', maxWidth: '95vw' },
	);

	readonly contentStyle = computed(() =>
		this.isFullscreen()
			? { 'overflow-y': 'auto' }
			: { 'max-height': '80vh', 'overflow-y': 'auto' },
	);
	// #endregion

	// #region Event handlers
	onVisibleChange(visible: boolean): void {
		if (!visible) {
			this.isFullscreen.set(false);
			this.asistenciaLoaded = false;
			this.visibleChange.emit(false);
		}
	}

	toggleFullscreen(): void {
		this.isFullscreen.update((v) => !v);
	}

	onTabChange(value: string): void {
		// Lazy-load: cargar asistencia la primera vez que se selecciona el tab
		if (value === '1' && !this.asistenciaLoaded) {
			this.asistenciaLoaded = true;
			const s = this.salon();
			if (s) {
				const now = new Date();
				this.loadAsistencia.emit({
					grado: s.grado,
					seccion: s.seccion,
					mes: now.getMonth() + 1,
					anio: now.getFullYear(),
				});
			}
		}
	}

	onAprobar(dto: AprobarEstudianteDto): void {
		this.aprobar.emit(dto);
	}

	onAprobarMasivo(dto: AprobacionMasivaDto): void {
		this.aprobarMasivo.emit(dto);
	}

	onMesChange(event: { mes: number; anio: number }): void {
		const s = this.salon();
		if (s) {
			this.loadAsistencia.emit({
				grado: s.grado,
				seccion: s.seccion,
				mes: event.mes,
				anio: event.anio,
			});
		}
	}

	onCursoChange(event: { salonId: number; cursoId: number }): void {
		this.loadNotas.emit(event);
	}
	// #endregion
}
