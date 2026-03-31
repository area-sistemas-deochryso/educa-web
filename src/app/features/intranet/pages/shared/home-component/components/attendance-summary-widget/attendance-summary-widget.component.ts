import { ChangeDetectionStrategy, Component, inject, OnInit, DestroyRef, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { DirectorAsistenciaApiService } from '@shared/services/asistencia/director-asistencia-api.service';
import { EstadisticasDia } from '@data/models/asistencia.models';
import { SkeletonLoaderComponent } from '@shared/components/skeleton-loader/skeleton-loader.component';

@Component({
	selector: 'app-attendance-summary-widget',
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
				</div>
				<a routerLink="/intranet/asistencia" class="widget-link">Ver detalle <i class="pi pi-arrow-right"></i></a>
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
						<span class="main-number">{{ stats()!.conEntrada }}</span>
						<span class="main-separator">/</span>
						<span class="main-total">{{ stats()!.totalEstudiantes }}</span>
						<span class="main-label">presentes</span>
					</div>
					<div class="percentage" [class]="percentageClass()">
						{{ stats()!.porcentajeAsistencia }}%
					</div>
				</div>

				<div class="stat-bars">
					<div class="stat-bar">
						<span class="bar-label">Completas</span>
						<div class="bar-track">
							<div class="bar-fill bar-completas" [style.width.%]="completasPercent()"></div>
						</div>
						<span class="bar-value">{{ stats()!.asistenciasCompletas }}</span>
					</div>
					<div class="stat-bar">
						<span class="bar-label">Solo entrada</span>
						<div class="bar-track">
							<div class="bar-fill bar-entrada" [style.width.%]="soloEntradaPercent()"></div>
						</div>
						<span class="bar-value">{{ soloEntrada() }}</span>
					</div>
					<div class="stat-bar">
						<span class="bar-label">Faltas</span>
						<div class="bar-track">
							<div class="bar-fill bar-faltas" [style.width.%]="faltasPercent()"></div>
						</div>
						<span class="bar-value">{{ stats()!.faltas }}</span>
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

			i { color: var(--primary-color); font-size: 1.1rem; }
			h3 { margin: 0; font-size: 1rem; font-weight: 600; color: var(--text-color); }
		}

		.widget-link {
			font-size: 0.8rem;
			color: var(--primary-color);
			text-decoration: none;
			display: flex;
			align-items: center;
			gap: 0.25rem;

			&:hover { text-decoration: underline; }
			i { font-size: 0.7rem; }
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

		.main-number { font-size: 2rem; font-weight: 700; color: var(--text-color); }
		.main-separator { font-size: 1.5rem; color: var(--text-color-secondary); }
		.main-total { font-size: 1.5rem; color: var(--text-color-secondary); }
		.main-label { font-size: 0.85rem; color: var(--text-color-secondary); margin-left: 0.5rem; }

		.percentage {
			font-size: 1.25rem;
			font-weight: 700;
			padding: 0.2rem 0.6rem;
			border-radius: 6px;

			&.high { background: rgba(34, 197, 94, 0.15); color: #16a34a; }
			&.medium { background: rgba(234, 179, 8, 0.15); color: #ca8a04; }
			&.low { background: rgba(239, 68, 68, 0.15); color: #dc2626; }
		}
		// #endregion

		// #region Bars
		.stat-bars { display: flex; flex-direction: column; gap: 0.5rem; }

		.stat-bar {
			display: grid;
			grid-template-columns: 90px 1fr 40px;
			align-items: center;
			gap: 0.5rem;
		}

		.bar-label { font-size: 0.8rem; color: var(--text-color-secondary); }
		.bar-value { font-size: 0.8rem; font-weight: 600; color: var(--text-color); text-align: right; }

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

		.bar-completas { background: #22c55e; }
		.bar-entrada { background: #eab308; }
		.bar-faltas { background: #ef4444; }
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

		.widget-skeleton { display: flex; flex-direction: column; gap: 0.75rem; }
		.skeleton-bars { display: flex; flex-direction: column; gap: 0.5rem; }
		// #endregion
	`,
})
export class AttendanceSummaryWidgetComponent implements OnInit {
	// #region Dependencias
	private api = inject(DirectorAsistenciaApiService);
	private destroyRef = inject(DestroyRef);
	// #endregion

	// #region Estado
	readonly loading = signal(true);
	readonly stats = signal<EstadisticasDia | null>(null);
	// #endregion

	// #region Computed
	readonly soloEntrada = computed(() => {
		const s = this.stats();
		return s ? s.conEntrada - s.asistenciasCompletas : 0;
	});

	readonly completasPercent = computed(() => {
		const s = this.stats();
		return s && s.totalEstudiantes > 0 ? (s.asistenciasCompletas / s.totalEstudiantes) * 100 : 0;
	});

	readonly soloEntradaPercent = computed(() => {
		const s = this.stats();
		return s && s.totalEstudiantes > 0 ? (this.soloEntrada() / s.totalEstudiantes) * 100 : 0;
	});

	readonly faltasPercent = computed(() => {
		const s = this.stats();
		return s && s.totalEstudiantes > 0 ? (s.faltas / s.totalEstudiantes) * 100 : 0;
	});

	readonly percentageClass = computed(() => {
		const p = this.stats()?.porcentajeAsistencia ?? 0;
		if (p >= 85) return 'high';
		if (p >= 70) return 'medium';
		return 'low';
	});
	// #endregion

	// #region Lifecycle
	ngOnInit(): void {
		this.api
			.getEstadisticasDirector()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (data) => {
					this.stats.set(data);
					this.loading.set(false);
				},
				error: () => this.loading.set(false),
			});
	}
	// #endregion
}
