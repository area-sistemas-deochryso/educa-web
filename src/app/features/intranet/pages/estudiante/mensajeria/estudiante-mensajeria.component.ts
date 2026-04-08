import { Component, ChangeDetectionStrategy, computed, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { EstudianteApiService } from '../services/estudiante-api.service';
import { SalonMensajeriaFacade } from '@features/intranet/pages/cross-role/mensajeria/services/mensajeria.facade';
import { SalonMensajeriaTabComponent } from '@features/intranet/pages/cross-role/mensajeria/components/mensajeria-tab/mensajeria-tab.component';
import { EstudianteSalonCurso, HorarioProfesorDto } from '../models/estudiante.models';
import { signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { logger, withRetry } from '@core/helpers';
import { PageHeaderComponent } from '@shared/components';

@Component({
	selector: 'app-estudiante-mensajeria',
	standalone: true,
	imports: [CommonModule, ProgressSpinnerModule, PageHeaderComponent, SalonMensajeriaTabComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		:host {
			display: block;
			height: calc(100vh - 120px);
			height: calc(100dvh - 120px);
		}
		.page-container {
			height: 100%;
			display: flex;
			flex-direction: column;
			padding: 0.75rem;
		}
		.tab-wrapper {
			flex: 1;
			min-height: 0;
			display: flex;
			flex-direction: column;
		}
		@media (max-width: 767px) {
			:host {
				height: calc(100vh - 100px);
				height: calc(100dvh - 100px);
			}
			.page-container {
				padding: 0.5rem;
			}
		}
	`,
	template: `
		<app-page-header icon="pi pi-envelope" title="Mensajería" />
		<div class="page-container">

			@if (loading()) {
				<div class="flex justify-content-center p-5">
					<p-progressSpinner strokeWidth="4" />
				</div>
			} @else if (cursoOptions().length === 0) {
				<div class="flex flex-column align-items-center p-5 text-color-secondary">
					<i class="pi pi-envelope text-4xl mb-3"></i>
					<p>No tienes cursos asignados</p>
				</div>
			} @else {
				<div class="tab-wrapper">
					<app-salon-mensajeria-tab
						[cursoOptions]="cursoOptions()"
						[isFullscreen]="true"
					/>
				</div>
			}
		</div>
	`,
})
export class EstudianteMensajeriaComponent implements OnInit, OnDestroy {
	// #region Dependencias
	private readonly api = inject(EstudianteApiService);
	private readonly mensajeriaFacade = inject(SalonMensajeriaFacade);
	private readonly destroyRef = inject(DestroyRef);
	// #endregion

	// #region Estado
	private readonly _horarios = signal<HorarioProfesorDto[]>([]);
	private readonly _loading = signal(false);
	readonly loading = this._loading.asReadonly();

	readonly cursoOptions = computed(() => {
		const horarios = this._horarios();
		const seen = new Map<number, boolean>();
		const options: { label: string; value: number }[] = [];

		for (const h of horarios) {
			if (!seen.has(h.cursoId)) {
				seen.set(h.cursoId, true);
				// API expects horarioId (h.id), not cursoId
				options.push({ label: h.cursoNombre, value: h.id });
			}
		}

		return options.sort((a, b) => a.label.localeCompare(b.label));
	});
	// #endregion

	// #region Lifecycle
	ngOnInit(): void {
		this._loading.set(true);
		this.api
			.getMisHorarios()
			.pipe(withRetry({ tag: 'EstudianteMensajeria:load' }), takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (horarios) => {
					this._horarios.set(horarios);
					this._loading.set(false);
				},
				error: (err) => {
					logger.error('EstudianteMensajeria: Error al cargar horarios', err);
					this._loading.set(false);
				},
			});
	}

	ngOnDestroy(): void {
		this.mensajeriaFacade.reset();
	}
	// #endregion
}
