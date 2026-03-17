import { Component, ChangeDetectionStrategy, computed, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ProfesorFacade } from '../services/profesor.facade';
import { SalonMensajeriaFacade } from '../salones/services/salon-mensajeria.facade';
import { SalonMensajeriaTabComponent } from '../salones/components/salon-mensajeria-tab/salon-mensajeria-tab.component';

@Component({
	selector: 'app-profesor-mensajeria',
	standalone: true,
	imports: [CommonModule, ProgressSpinnerModule, SalonMensajeriaTabComponent],
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
		.page-title {
			margin: 0 0 0.5rem 0.25rem;
			font-size: 1.25rem;
			font-weight: 700;
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
			.page-title {
				font-size: 1.1rem;
				margin-bottom: 0.35rem;
			}
		}
	`,
	template: `
		<div class="page-container">
			<h2 class="page-title">Mensajería</h2>

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
export class ProfesorMensajeriaComponent implements OnInit, OnDestroy {
	// #region Dependencias
	private readonly facade = inject(ProfesorFacade);
	private readonly mensajeriaFacade = inject(SalonMensajeriaFacade);
	// #endregion

	// #region Estado
	readonly loading = computed(() => this.facade.vm().loading);

	readonly cursoOptions = computed(() => {
		const horarios = this.facade.vm().horarios;
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
		if (this.facade.vm().horarios.length === 0) {
			this.facade.loadData();
		}
	}

	ngOnDestroy(): void {
		this.mensajeriaFacade.reset();
	}
	// #endregion
}
