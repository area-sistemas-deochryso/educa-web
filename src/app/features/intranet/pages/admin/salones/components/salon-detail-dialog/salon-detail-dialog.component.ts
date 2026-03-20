import { Component, ChangeDetectionStrategy, input, output, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { DialogModule } from 'primeng/dialog';
import { TabsModule } from 'primeng/tabs';
import { ButtonModule } from 'primeng/button';

import { EstudianteAsistencia } from '@shared/services/asistencia';
import { HorarioResponseDto, SalonNotasResumenDto } from '@data/models';

import {
	SalonAdminListDto,
	AprobacionEstudianteListDto,
	AprobarEstudianteDto,
	AprobacionMasivaDto,
} from '../../models';
import { SalonAprobacionTabComponent } from '../salon-aprobacion-tab/salon-aprobacion-tab.component';
import { SalonAsistenciaTabComponent } from '../salon-asistencia-tab/salon-asistencia-tab.component';
import { SalonNotasTabComponent } from '../salon-notas-tab/salon-notas-tab.component';

@Component({
	selector: 'app-salon-detail-dialog',
	standalone: true,
	imports: [
		CommonModule,
		DialogModule,
		TabsModule,
		ButtonModule,
		SalonAprobacionTabComponent,
		SalonAsistenciaTabComponent,
		SalonNotasTabComponent,
	],
	templateUrl: './salon-detail-dialog.component.html',
	styleUrl: './salon-detail-dialog.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SalonDetailDialogComponent {
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
