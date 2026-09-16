import { Component, ChangeDetectionStrategy, computed, inject, OnInit, OnDestroy } from '@angular/core';

import { EstudianteFacade } from '../services/estudiante.facade';
import { SalonMensajeriaFacade } from '@features/intranet/pages/cross-role/mensajeria/services/mensajeria.facade';
import { MensajeriaPageComponent } from '@features/intranet/pages/cross-role/mensajeria/components/mensajeria-page/mensajeria-page.component';
import { HorarioProfesorDto } from '../models/estudiante.models';
import { signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { logger, withRetry } from '@core/helpers';

@Component({
	selector: 'app-estudiante-mensajeria',
	standalone: true,
	imports: [MensajeriaPageComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<app-mensajeria-page [loading]="loading()" [cursoOptions]="cursoOptions()" />
	`,
})
export class EstudianteMensajeriaComponent implements OnInit, OnDestroy {
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
