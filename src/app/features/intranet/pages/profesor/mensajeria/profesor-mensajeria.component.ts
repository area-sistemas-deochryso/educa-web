import { Component, ChangeDetectionStrategy, computed, inject, OnInit, OnDestroy } from '@angular/core';

import { ProfesorFacade } from '../services/profesor.facade';
import { SalonMensajeriaFacade } from '@features/intranet/pages/cross-role/mensajeria/services/mensajeria.facade';
import { MensajeriaPageComponent } from '@features/intranet/pages/cross-role/mensajeria/components/mensajeria-page/mensajeria-page.component';

@Component({
	selector: 'app-profesor-mensajeria',
	standalone: true,
	imports: [MensajeriaPageComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<app-mensajeria-page [loading]="loading()" [cursoOptions]="cursoOptions()" />
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
