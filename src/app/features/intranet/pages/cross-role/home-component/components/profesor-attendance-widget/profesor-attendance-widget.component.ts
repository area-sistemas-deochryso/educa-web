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
import { switchMap, of, forkJoin } from 'rxjs';
import { TeacherAttendanceApiService } from '@shared/services/attendance/teacher-attendance-api.service';
import { SalonProfesor, EstadisticasAsistenciaDia } from '@data/models/attendance.models';
import { SkeletonLoaderComponent } from '@shared/components/skeleton-loader/skeleton-loader.component';

@Component({
	selector: 'app-profesor-attendance-widget',
	standalone: true,
	imports: [RouterLink, SkeletonLoaderComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<!-- #region Template -->
		<div class="widget-card">
			<div class="widget-header">
				<div class="widget-title">
					<i class="pi pi-users"></i>
					<h3>Asistencia de Hoy</h3>
					@if (salonLabel()) {
						<span class="salon-badge">{{ salonLabel() }}</span>
					}
				</div>
				<a routerLink="/intranet/profesor/asistencia" class="widget-link"
					>Ver detalle <i class="pi pi-arrow-right"></i
				></a>
			</div>

			@if (loading()) {
				<div class="widget-skeleton">
					<app-skeleton-loader variant="rect" width="100%" height="64px" />
					<div class="skeleton-bars">
						<app-skeleton-loader variant="rect" width="100%" height="24px" />
						<app-skeleton-loader variant="rect" width="80%" height="24px" />
					</div>
				</div>
			} @else if (stats()) {
				<div class="widget-body">
					<div class="main-stat">
						<span class="main-number">{{ presentes() }}</span>
						<span class="main-separator">/</span>
						<span class="main-total">{{ stats()!.total }}</span>
						<span class="main-label">presentes</span>
					</div>
					<div class="percentage" [class]="percentageClass()">{{ porcentaje() }}%</div>
				</div>

				<div class="stat-bars">
					<div class="stat-bar">
						<span class="bar-label">Asistió</span>
						<div class="bar-track">
							<div
								class="bar-fill bar-asistio"
								[style.width.%]="barPercent(stats()!.asistio)"
							></div>
						</div>
						<span class="bar-value">{{ stats()!.asistio }}</span>
					</div>
					<div class="stat-bar">
						<span class="bar-label">Tardanza</span>
						<div class="bar-track">
							<div
								class="bar-fill bar-tardanza"
								[style.width.%]="barPercent(stats()!.tardanza)"
							></div>
						</div>
						<span class="bar-value">{{ stats()!.tardanza }}</span>
					</div>
					<div class="stat-bar">
						<span class="bar-label">Falta</span>
						<div class="bar-track">
							<div
								class="bar-fill bar-falta"
								[style.width.%]="barPercent(stats()!.falta)"
							></div>
						</div>
						<span class="bar-value">{{ stats()!.falta }}</span>
					</div>
				</div>
			} @else {
				<div class="widget-empty">
					<i class="pi pi-info-circle"></i>
					<span>Sin datos de asistencia para hoy</span>
				</div>
			}
		</div>
		<!-- #endregion -->
	`,
	styles: `
		// #region Host
		:host {
			display: block;
			padding: 0 2rem;
			margin-bottom: 1.5rem;
		}
		// #endregion

		// #region Card
		.widget-card {
			background: var(--surface-card);
			border: 1px solid var(--surface-border);
			border-radius: 12px;
			padding: 1.25rem 1.5rem;
		}
		// #endregion

		// #region Header
		.widget-header {
			display: flex;
			justify-content: space-between;
			align-items: center;
			margin-bottom: 1rem;
		}

		.widget-title {
			display: flex;
			align-items: center;
			gap: 0.5rem;

			i {
				color: var(--intranet-accent-color-blue, #253470);
				font-size: 1.1rem;
			}
			h3 {
				margin: 0;
				font-size: 1rem;
				font-weight: 600;
				color: var(--text-color);
			}
		}

		.salon-badge {
			font-size: 0.7rem;
			font-weight: 600;
			color: #fff;
			background: var(--intranet-accent-color-blue, #253470);
			padding: 0.15rem 0.5rem;
			border-radius: 6px;
			letter-spacing: 0.02em;
		}

		.widget-link {
			font-size: 0.8rem;
			color: var(--intranet-accent-color-blue, #253470);
			text-decoration: none;
			display: flex;
			align-items: center;
			gap: 0.25rem;
			font-weight: 500;

			&:hover {
				text-decoration: underline;
			}
			i {
				font-size: 0.7rem;
			}
		}
		// #endregion

		// #region Main stat
		.widget-body {
			display: flex;
			align-items: baseline;
			justify-content: space-between;
			margin-bottom: 1rem;
		}

		.main-stat {
			display: flex;
			align-items: baseline;
			gap: 0.15rem;
		}

		.main-number {
			font-size: 2rem;
			font-weight: 700;
			color: var(--text-color);
		}
		.main-separator {
			font-size: 1.5rem;
			color: var(--text-color-secondary);
		}
		.main-total {
			font-size: 1.5rem;
			color: var(--text-color-secondary);
		}
		.main-label {
			font-size: 0.85rem;
			color: var(--text-color-secondary);
			margin-left: 0.5rem;
		}

		.percentage {
			font-size: 1.25rem;
			font-weight: 700;
			padding: 0.2rem 0.6rem;
			border-radius: 6px;

			&.high {
				background: rgba(34, 197, 94, 0.15);
				color: #16a34a;
			}
			&.medium {
				background: rgba(234, 179, 8, 0.15);
				color: #ca8a04;
			}
			&.low {
				background: rgba(239, 68, 68, 0.15);
				color: #dc2626;
			}
		}
		// #endregion

		// #region Bars
		.stat-bars {
			display: flex;
			flex-direction: column;
			gap: 0.5rem;
		}

		.stat-bar {
			display: grid;
			grid-template-columns: 90px 1fr 40px;
			align-items: center;
			gap: 0.5rem;
		}

		.bar-label {
			font-size: 0.8rem;
			color: var(--text-color-secondary);
		}
		.bar-value {
			font-size: 0.8rem;
			font-weight: 600;
			color: var(--text-color);
			text-align: right;
		}

		.bar-track {
			height: 8px;
			background: var(--surface-200);
			border-radius: 4px;
			overflow: hidden;
		}

		.bar-fill {
			height: 100%;
			border-radius: 4px;
			transition: width 0.5s ease;
		}

		.bar-asistio {
			background: #77a02d;
		}
		.bar-tardanza {
			background: #ffcc0c;
		}
		.bar-falta {
			background: #f44336;
		}
		// #endregion

		// #region Empty & skeleton
		.widget-empty {
			display: flex;
			align-items: center;
			gap: 0.5rem;
			padding: 1rem 0;
			color: var(--text-color-secondary);
			font-size: 0.85rem;
		}

		.widget-skeleton {
			display: flex;
			flex-direction: column;
			gap: 0.75rem;
		}
		.skeleton-bars {
			display: flex;
			flex-direction: column;
			gap: 0.5rem;
		}
		// #endregion
	`,
})
export class ProfesorAttendanceWidgetComponent implements OnInit {
	// #region Dependencias
	private api = inject(TeacherAttendanceApiService);
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
