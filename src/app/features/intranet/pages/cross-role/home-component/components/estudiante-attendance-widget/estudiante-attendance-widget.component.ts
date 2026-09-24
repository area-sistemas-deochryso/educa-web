// #region Imports
import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { logger } from '@core/helpers';
import { EstudianteApiService } from '@features/intranet/pages/estudiante/services';
import {
	EstadoAsistenciaCurso,
	ESTADO_ASISTENCIA_LABELS,
	ESTADO_ASISTENCIA_SEVERITIES,
	MiAsistenciaCursoResumenDto,
} from '@features/intranet/pages/estudiante/models/estudiante.models';
import { formatDateISO } from '@intranet-shared/helpers';
import { SkeletonLoaderComponent } from '@shared/components';

// #endregion
// #region Implementation
@Component({
	selector: 'app-estudiante-attendance-widget',
	standalone: true,
	imports: [RouterLink, SkeletonLoaderComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './estudiante-attendance-widget.component.html',
	styleUrl: './estudiante-attendance-widget.component.scss',
})
export class EstudianteAttendanceWidgetComponent implements OnInit {
	// #region Dependencias
	private estudianteApi = inject(EstudianteApiService);
	private destroyRef = inject(DestroyRef);
	// #endregion

	// #region Estado
	readonly loading = signal(true);
	readonly resumen = signal<MiAsistenciaCursoResumenDto | null>(null);
	// #endregion

	// #region Computed
	readonly estadoHoy = computed<EstadoAsistenciaCurso | null>(() => {
		const hoy = formatDateISO(new Date());
		return this.resumen()?.detalle.find((d) => d.fecha === hoy)?.estado ?? null;
	});

	readonly hasDataHoy = computed(() => this.estadoHoy() !== null);

	readonly estadoLabel = computed(() => {
		const estado = this.estadoHoy();
		return estado ? ESTADO_ASISTENCIA_LABELS[estado] : '';
	});

	readonly estadoSeverityClass = computed(() => {
		const estado = this.estadoHoy();
		return estado ? `estado-${ESTADO_ASISTENCIA_SEVERITIES[estado]}` : '';
	});

	readonly cursoNombre = computed(() => this.resumen()?.cursoNombre ?? '');
	// #endregion

	// #region Lifecycle
	ngOnInit(): void {
		this.estudianteApi
			.getMiAsistenciaActiva()
			.pipe(
				catchError((err) => {
					logger.warn('[EstudianteAttendanceWidget] getMiAsistenciaActiva failed — fallback null', err?.status);
					return of(null);
				}),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((resolucion) => {
				this.resumen.set(resolucion?.resumen ?? null);
				this.loading.set(false);
			});
	}
	// #endregion
}
// #endregion
