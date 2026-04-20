import {
	ChangeDetectionStrategy,
	Component,
	inject,
	OnInit,
	DestroyRef,
	signal,
	computed,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { forkJoin, of, catchError } from 'rxjs';
import {
	AttendanceService,
	AsistenciaProfesorApiService,
} from '@shared/services/attendance';
import {
	EstadisticasDia,
	EstadisticasAsistenciaDia,
} from '@data/models/attendance.models';
import { SkeletonLoaderComponent } from '@shared/components/skeleton-loader/skeleton-loader.component';

@Component({
	selector: 'app-attendance-summary-widget',
	standalone: true,
	imports: [RouterLink, SkeletonLoaderComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './attendance-summary-widget.component.html',
	styleUrl: './attendance-summary-widget.component.scss',
})
export class AttendanceSummaryWidgetComponent implements OnInit {
	// #region Dependencias
	private attendance = inject(AttendanceService);
	private profesorApi = inject(AsistenciaProfesorApiService);
	private destroyRef = inject(DestroyRef);
	// #endregion

	// #region Estado
	readonly loading = signal(true);
	readonly estStats = signal<EstadisticasDia | null>(null);
	readonly profStats = signal<EstadisticasAsistenciaDia | null>(null);
	// #endregion

	// #region Computed — Estudiantes
	readonly estSoloEntrada = computed(() => {
		const s = this.estStats();
		return s ? s.conEntrada - s.asistenciasCompletas : 0;
	});

	readonly estCompletasPercent = computed(() => {
		const s = this.estStats();
		return s && s.totalEstudiantes > 0
			? (s.asistenciasCompletas / s.totalEstudiantes) * 100
			: 0;
	});

	readonly estSoloEntradaPercent = computed(() => {
		const s = this.estStats();
		return s && s.totalEstudiantes > 0
			? (this.estSoloEntrada() / s.totalEstudiantes) * 100
			: 0;
	});

	readonly estFaltasPercent = computed(() => {
		const s = this.estStats();
		return s && s.totalEstudiantes > 0 ? (s.faltas / s.totalEstudiantes) * 100 : 0;
	});

	readonly estPercentageClass = computed(() => {
		const p = this.estStats()?.porcentajeAsistencia ?? 0;
		if (p >= 85) return 'high';
		if (p >= 70) return 'medium';
		return 'low';
	});
	// #endregion

	// #region Computed — Profesores
	readonly profPresentes = computed(() => {
		const p = this.profStats();
		if (!p) return 0;
		return p.asistio + p.tardanza;
	});

	readonly profPorcentaje = computed(() => {
		const p = this.profStats();
		if (!p || p.total === 0) return 0;
		return Math.round((this.profPresentes() / p.total) * 100);
	});

	readonly profPercentageClass = computed(() => {
		const p = this.profPorcentaje();
		if (p >= 85) return 'high';
		if (p >= 70) return 'medium';
		return 'low';
	});

	profBarPercent(value: number): number {
		const p = this.profStats();
		return p && p.total > 0 ? (value / p.total) * 100 : 0;
	}
	// #endregion

	// #region Lifecycle
	ngOnInit(): void {
		const hoy = new Date();

		// catchError por rama: si una call falla la otra sigue.
		const est$ = this.attendance
			.getEstadisticasDirector()
			.pipe(catchError(() => of(null)));

		const prof$ = this.profesorApi
			.obtenerAsistenciaDiaProfesoresDirector(hoy)
			.pipe(catchError(() => of(null)));

		forkJoin({ est: est$, prof: prof$ })
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: ({ est, prof }) => {
					this.estStats.set(est);
					this.profStats.set(prof ? prof.estadisticas : null);
					this.loading.set(false);
				},
				error: () => this.loading.set(false),
			});
	}
	// #endregion
}
