import { ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core';

import { StatsSkeletonComponent, TableSkeletonComponent } from '@shared/components';
import type { SkeletonColumnDef } from '@shared/components';

import { CorreoBlacklistCardComponent } from './components/correo-blacklist-card/correo-blacklist-card.component';
import { CorreoHeaderComponent } from './components/correo-header/correo-header.component';
import { CorreoHistoriaTableComponent } from './components/correo-historia-table/correo-historia-table.component';
import { CorreoPersonasTableComponent } from './components/correo-personas-table/correo-personas-table.component';
import { CorreoResumenComponent } from './components/correo-resumen/correo-resumen.component';
import { CorreoIndividualFacade } from './services';

const PERSONAS_COLUMNS: SkeletonColumnDef[] = [
	{ width: '140px', cellType: 'badge' },
	{ width: '110px', cellType: 'text' },
	{ width: 'flex', cellType: 'text' },
	{ width: '180px', cellType: 'text' },
];

const HISTORIA_COLUMNS: SkeletonColumnDef[] = [
	{ width: '44px', cellType: 'text' },
	{ width: '170px', cellType: 'text' },
	{ width: '120px', cellType: 'badge' },
	{ width: 'flex', cellType: 'text' },
	{ width: '120px', cellType: 'badge' },
	{ width: '140px', cellType: 'text' },
	{ width: '80px', cellType: 'text' },
];

@Component({
	selector: 'app-tab-correo-individual',
	standalone: true,
	imports: [
		StatsSkeletonComponent,
		TableSkeletonComponent,
		CorreoHeaderComponent,
		CorreoResumenComponent,
		CorreoBlacklistCardComponent,
		CorreoPersonasTableComponent,
		CorreoHistoriaTableComponent,
	],
	templateUrl: './tab-correo-individual.component.html',
	styleUrl: './tab-correo-individual.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabCorreoIndividualComponent {
	// #region Inputs — correo inicial desde query param ?correo=
	readonly initialCorreo = input<string | null>(null);
	// #endregion

	// #region Dependencias
	private facade = inject(CorreoIndividualFacade);
	// #endregion

	// #region Estado
	readonly vm = this.facade.vm;
	readonly personasColumns = PERSONAS_COLUMNS;
	readonly historiaColumns = HISTORIA_COLUMNS;
	// #endregion

	// #region Lifecycle
	constructor() {
		// * Si llega ?correo= en la URL, autocargar el input y disparar la búsqueda
		// * una sola vez. El effect reacciona al signal del input.
		let initializado = false;
		effect(() => {
			const correo = this.initialCorreo();
			if (!initializado && correo) {
				initializado = true;
				this.facade.setCorreoInput(correo);
				this.facade.buscar(correo);
			}
		});
	}
	// #endregion

	// #region Handlers
	onCorreoInputChange(value: string): void {
		this.facade.setCorreoInput(value);
	}

	onBuscar(correo: string): void {
		this.facade.buscar(correo);
	}

	onLimpiar(): void {
		this.facade.limpiar();
	}
	// #endregion
}
