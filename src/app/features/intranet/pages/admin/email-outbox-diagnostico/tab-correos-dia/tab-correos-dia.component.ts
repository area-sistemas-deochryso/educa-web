import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TabsModule } from 'primeng/tabs';

import { StatsSkeletonComponent, TableSkeletonComponent } from '@shared/components';
import type { SkeletonColumnDef } from '@shared/components';

import { ApoderadosBlacklisteadosTableComponent } from './components/apoderados-blacklisteados-table/apoderados-blacklisteados-table.component';
import { CorreosDiaHeaderComponent } from './components/correos-dia-header/correos-dia-header.component';
import { CorreosDiaResumenComponent } from './components/correos-dia-resumen/correos-dia-resumen.component';
import { EntradasConCorreoTableComponent } from './components/entradas-con-correo-table/entradas-con-correo-table.component';
import { EntradasSinCorreoTableComponent } from './components/entradas-sin-correo-table/entradas-sin-correo-table.component';
import { EstudiantesSinCorreoTableComponent } from './components/estudiantes-sin-correo-table/estudiantes-sin-correo-table.component';
import { CorreosDiaFacade } from './services';

const LISTA_SIMPLE_COLUMNS: SkeletonColumnDef[] = [
	{ width: '110px', cellType: 'text' },
	{ width: 'flex', cellType: 'text' },
	{ width: '160px', cellType: 'badge' },
];

const BLACKLIST_COLUMNS: SkeletonColumnDef[] = [
	{ width: 'flex', cellType: 'text' },
	{ width: '140px', cellType: 'badge' },
	{ width: '170px', cellType: 'text' },
	{ width: '120px', cellType: 'badge' },
];

const ENTRADAS_COLUMNS: SkeletonColumnDef[] = [
	{ width: '110px', cellType: 'text' },
	{ width: 'flex', cellType: 'text' },
	{ width: '160px', cellType: 'badge' },
	{ width: '100px', cellType: 'text' },
	{ width: '200px', cellType: 'badge' },
	{ width: '160px', cellType: 'text' },
];

const ENVIADOS_COLUMNS: SkeletonColumnDef[] = [
	{ width: '110px', cellType: 'text' },
	{ width: 'flex', cellType: 'text' },
	{ width: '160px', cellType: 'badge' },
	{ width: '90px', cellType: 'text' },
	{ width: '180px', cellType: 'text' },
	{ width: '90px', cellType: 'text' },
	{ width: '90px', cellType: 'badge' },
	{ width: '110px', cellType: 'badge' },
];

@Component({
	selector: 'app-tab-correos-dia',
	standalone: true,
	imports: [
		TabsModule,
		StatsSkeletonComponent,
		TableSkeletonComponent,
		CorreosDiaHeaderComponent,
		CorreosDiaResumenComponent,
		EstudiantesSinCorreoTableComponent,
		ApoderadosBlacklisteadosTableComponent,
		EntradasSinCorreoTableComponent,
		EntradasConCorreoTableComponent,
	],
	templateUrl: './tab-correos-dia.component.html',
	styleUrl: './tab-correos-dia.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabCorreosDiaComponent {
	// #region Dependencias
	private facade = inject(CorreosDiaFacade);
	// #endregion

	// #region Estado
	readonly vm = this.facade.vm;
	readonly listaSimpleColumns = LISTA_SIMPLE_COLUMNS;
	readonly blacklistColumns = BLACKLIST_COLUMNS;
	readonly entradasColumns = ENTRADAS_COLUMNS;
	readonly enviadosColumns = ENVIADOS_COLUMNS;
	readonly hasData = computed(() => this.vm().dto !== null);
	// #endregion

	// #region Lifecycle
	constructor() {
		this.facade.loadData();
	}
	// #endregion

	// #region Handlers
	onRefresh(): void {
		this.facade.refresh();
	}

	onFechaChange(fecha: string | null): void {
		this.facade.setFecha(fecha);
	}
	// #endregion
}
