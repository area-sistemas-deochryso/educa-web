import { Component, ChangeDetectionStrategy, computed, inject, signal, OnInit, OnDestroy, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { PageHeaderComponent } from '@shared/components';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { logger, withRetry } from '@core/helpers';
import { EstudianteFacade } from '../services/estudiante.facade';
import { SalonMensajeriaFacade } from '@features/intranet/pages/cross-role/mensajeria/services/mensajeria.facade';
import { SalonForoTabComponent } from '@features/intranet/pages/cross-role/mensajeria/components/foro-tab/foro-tab.component';
import { HorarioProfesorDto } from '../models/estudiante.models';
import { toSelectOptionsFrom } from '@shared/models';

@Component({
	selector: 'app-estudiante-foro',
	standalone: true,
	imports: [CommonModule, ProgressSpinnerModule, PageHeaderComponent, SalonForoTabComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		:host {
			display: block;
		}
		.page-container {
			display: flex;
			flex-direction: column;
		}
	`,
	template: `
		<app-page-header icon="pi pi-comments" title="Foro" />
		<div class="page-container p-4 pt-0">

			@if (loading()) {
				<div class="flex justify-content-center p-5">
					<p-progressSpinner strokeWidth="4" />
				</div>
			} @else if (cursoOptions().length === 0) {
				<div class="flex flex-column align-items-center p-5 text-color-secondary">
					<i class="pi pi-comments text-4xl mb-3"></i>
					<p>No tienes cursos asignados</p>
				</div>
			} @else {
				<app-salon-foro-tab [cursoOptions]="cursoOptions()" [readOnly]="true" />
			}
		</div>
	`,
})
export class EstudianteForoComponent implements OnInit, OnDestroy {
	// #region Dependencias
	private readonly api = inject(EstudianteFacade);
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
		const unique: HorarioProfesorDto[] = [];

		for (const h of horarios) {
			if (!seen.has(h.cursoId)) {
				seen.set(h.cursoId, true);
				unique.push(h);
			}
		}

		return toSelectOptionsFrom(unique, 'cursoNombre', 'id').sort((a, b) =>
			a.label.localeCompare(b.label),
		);
	});
	// #endregion

	// #region Lifecycle
	ngOnInit(): void {
		this._loading.set(true);
		this.api
			.getMisHorarios()
			.pipe(withRetry({ tag: 'EstudianteForo:load' }), takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (horarios) => {
					this._horarios.set(horarios);
					this._loading.set(false);
				},
				error: (err) => {
					logger.error('EstudianteForo: Error al cargar horarios', err);
					this._loading.set(false);
				},
			});
	}

	ngOnDestroy(): void {
		this.mensajeriaFacade.reset();
	}
	// #endregion
}
