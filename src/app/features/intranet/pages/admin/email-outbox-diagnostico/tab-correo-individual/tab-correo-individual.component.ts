import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { StatsSkeletonComponent, TableSkeletonComponent } from '@intranet-shared/components';
import type { SkeletonColumnDef } from '@intranet-shared/components';

import { CorreoBlacklistCardComponent } from './components/correo-blacklist-card/correo-blacklist-card.component';
import { CorreoDetailDrawerComponent } from './components/correo-detail-drawer/correo-detail-drawer.component';
import { CorreoHeaderComponent } from './components/correo-header/correo-header.component';
import { CorreoHistoriaTableComponent } from './components/correo-historia-table/correo-historia-table.component';
import { CorreoPersonasTableComponent } from './components/correo-personas-table/correo-personas-table.component';
import { CorreoResumenComponent } from './components/correo-resumen/correo-resumen.component';
import { EmailDiagnosticoHistoriaItem, PersonaConCorreoDto } from './models/correo-individual.models';
import { CorreoIndividualFacade, CorreoIndividualService } from './services';

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
	{ width: '110px', cellType: 'badge' },
	{ width: '50px', cellType: 'text' },
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
		CorreoDetailDrawerComponent,
	],
	templateUrl: './tab-correo-individual.component.html',
	styleUrl: './tab-correo-individual.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabCorreoIndividualComponent {
	// #region Inputs
	readonly initialCorreo = input<string | null>(null);
	// #endregion

	// #region Dependencias
	private facade = inject(CorreoIndividualFacade);
	private api = inject(CorreoIndividualService);
	// #endregion

	// #region Estado
	readonly vm = this.facade.vm;
	readonly personasColumns = PERSONAS_COLUMNS;
	readonly historiaColumns = HISTORIA_COLUMNS;
	// #endregion

	// #region Drawer state
	readonly drawerVisible = signal(false);
	readonly drawerItem = signal<EmailDiagnosticoHistoriaItem | null>(null);
	readonly drawerHtml = signal<string | null>(null);
	readonly drawerLoadingHtml = signal(false);
	// #endregion

	// #region Lifecycle
	constructor() {
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

	onTypeaheadQuery(q: string): void {
		this.facade.onTypeaheadQuery(q);
	}

	onSeleccionarPersona(persona: PersonaConCorreoDto): void {
		this.facade.seleccionarPersona(persona);
	}
	// #endregion

	// #region Drawer handlers
	onViewDetail(item: EmailDiagnosticoHistoriaItem): void {
		this.drawerItem.set(item);
		this.drawerHtml.set(null);
		this.drawerVisible.set(true);
	}

	onDrawerVisibleChange(visible: boolean): void {
		this.drawerVisible.set(visible);
	}

	onCloseDrawer(): void {
		this.drawerVisible.set(false);
	}

	async onLoadHtml(id: number): Promise<void> {
		this.drawerLoadingHtml.set(true);
		try {
			const res = await firstValueFrom(this.api.obtenerCuerpoHtml(id));
			this.drawerHtml.set(res.html);
		} catch {
			this.drawerHtml.set('<p style="color:var(--red-600)">No se pudo cargar el contenido.</p>');
		} finally {
			this.drawerLoadingHtml.set(false);
		}
	}
	// #endregion
}
