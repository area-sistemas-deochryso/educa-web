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
import { forkJoin, of, catchError, Observable } from 'rxjs';
import {
	AttendanceService,
	AsistenciaProfesorApiService,
} from '@shared/services/attendance';
import {
	SalonProfesor,
	EstadisticasAsistenciaDia,
	AsistenciaDetalle,
	AsistenciaDiaConEstadisticas,
	AttendanceStatus,
} from '@data/models/attendance.models';
import { SkeletonLoaderComponent } from '@shared/components/skeleton-loader/skeleton-loader.component';

@Component({
	selector: 'app-profesor-attendance-widget',
	standalone: true,
	imports: [RouterLink, SkeletonLoaderComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './profesor-attendance-widget.component.html',
	styleUrl: './profesor-attendance-widget.component.scss',
})
export class ProfesorAttendanceWidgetComponent implements OnInit {
	// #region Dependencias
	private attendance = inject(AttendanceService);
	private profesorApi = inject(AsistenciaProfesorApiService);
	private destroyRef = inject(DestroyRef);
	// #endregion

	// #region Estado
	readonly loading = signal(true);
	readonly miAsistencia = signal<AsistenciaDetalle | null>(null);
	readonly stats = signal<EstadisticasAsistenciaDia | null>(null);
	readonly salon = signal<SalonProfesor | null>(null);
	// #endregion

	// #region Computed — Salón
	readonly hasSalonData = computed(() => this.salon() !== null);

	readonly salonLabel = computed(() => {
		const s = this.salon();
		return s ? `${s.grado} ${s.seccion}` : '';
	});

	readonly presentes = computed(() => {
		const s = this.stats();
		if (!s) return 0;
		return s.asistio + s.tardanza;
	});

	readonly porcentaje = computed(() => {
		const s = this.stats();
		if (!s || s.total === 0) return 0;
		return Math.round((this.presentes() / s.total) * 100);
	});

	readonly percentageClass = computed(() => {
		const p = this.porcentaje();
		if (p >= 85) return 'high';
		if (p >= 70) return 'medium';
		return 'low';
	});
	// #endregion

	// #region Computed — Mi asistencia
	readonly miEstadoCodigo = computed<AttendanceStatus | null>(() => {
		return this.miAsistencia()?.estadoCodigo ?? null;
	});

	readonly miEstadoLabel = computed(() => {
		const codigo = this.miEstadoCodigo();
		switch (codigo) {
			case 'A':
				return 'Asistió';
			case 'T':
				return 'Tardanza';
			case 'F':
				return 'Falta';
			case 'J':
				return 'Justificado';
			case '-':
				return 'Pendiente';
			case 'X':
				return 'Sin registro';
			default:
				return 'Sin registro';
		}
	});

	readonly miEstadoClass = computed(() => {
		const codigo = this.miEstadoCodigo();
		switch (codigo) {
			case 'A':
				return 'estado-asistio';
			case 'T':
				return 'estado-tardanza';
			case 'F':
				return 'estado-falta';
			case 'J':
				return 'estado-justificado';
			default:
				return 'estado-pendiente';
		}
	});
	// #endregion

	// #region Helpers
	barPercent(value: number): number {
		const s = this.stats();
		return s && s.total > 0 ? (value / s.total) * 100 : 0;
	}
	// #endregion

	// #region Lifecycle
	ngOnInit(): void {
		const hoy = new Date();

		this.attendance
			.getSalonesProfesor()
			.pipe(catchError(() => of([] as SalonProfesor[])))
			.subscribe((salones) => {
				// Preferir salón donde es tutor (INV-AS04). Sin tutor: no hay sección "Mi salón".
				const tutor = salones.find((s) => s.esTutor) ?? null;
				this.salon.set(tutor);

				const salon$: Observable<AsistenciaDiaConEstadisticas | null> = tutor
					? this.attendance
							.getAsistenciaDia(tutor.grado, tutor.seccion, hoy)
							.pipe(catchError(() => of(null)))
					: of(null);

				const mi$ = this.profesorApi
					.obtenerMiAsistenciaDia(hoy)
					.pipe(catchError(() => of(null)));

				forkJoin({ mi: mi$, salon: salon$ })
					.pipe(takeUntilDestroyed(this.destroyRef))
					.subscribe({
						next: ({ mi, salon }) => {
							this.miAsistencia.set(mi?.asistencias?.[0] ?? null);
							this.stats.set(salon ? salon.estadisticas : null);
							this.loading.set(false);
						},
						error: () => this.loading.set(false),
					});
			});
	}
	// #endregion
}
