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
import { switchMap, of } from 'rxjs';
import { AttendanceService } from '@shared/services/attendance/attendance.service';
import { SalonProfesor, EstadisticasAsistenciaDia } from '@data/models/attendance.models';
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
	private api = inject(AttendanceService);
	private destroyRef = inject(DestroyRef);
	// #endregion

	// #region Estado
	readonly loading = signal(true);
	readonly stats = signal<EstadisticasAsistenciaDia | null>(null);
	readonly salon = signal<SalonProfesor | null>(null);
	// #endregion

	// #region Computed
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

	// #region Helpers
	barPercent(value: number): number {
		const s = this.stats();
		return s && s.total > 0 ? (value / s.total) * 100 : 0;
	}
	// #endregion

	// #region Lifecycle
	ngOnInit(): void {
		this.api
			.getSalonesProfesor()
			.pipe(
				switchMap((salones) => {
					// Preferir salón donde es tutor, si no el primero
					const tutor = salones.find((s) => s.esTutor);
					const selected = tutor ?? salones[0];
					if (!selected) return of(null);

					this.salon.set(selected);
					return this.api.getAsistenciaDia(selected.grado, selected.seccion, new Date());
				}),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe({
				next: (data) => {
					if (data) {
						this.stats.set(data.estadisticas);
					}
					this.loading.set(false);
				},
				error: () => this.loading.set(false),
			});
	}
	// #endregion
}
