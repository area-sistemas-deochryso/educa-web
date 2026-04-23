import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ButtonModule } from 'primeng/button';

import { PageHeaderComponent } from '@intranet-shared/components';

import { AuditoriaCorreosStatsComponent } from './components/auditoria-correos-stats/auditoria-correos-stats.component';
import { AuditoriaCorreosFiltersComponent } from './components/auditoria-correos-filters/auditoria-correos-filters.component';
import { AuditoriaCorreosTableComponent } from './components/auditoria-correos-table/auditoria-correos-table.component';
import { AuditoriaCorreosSkeletonComponent } from './components/auditoria-correos-skeleton/auditoria-correos-skeleton.component';
import { AuditoriaCorreosFacade } from './services';
import { AuditoriaCorreoAsistenciaDto, TipoOrigenAuditoria } from './models';

@Component({
	selector: 'app-auditoria-correos',
	standalone: true,
	imports: [
		CommonModule,
		ButtonModule,
		PageHeaderComponent,
		AuditoriaCorreosStatsComponent,
		AuditoriaCorreosFiltersComponent,
		AuditoriaCorreosTableComponent,
		AuditoriaCorreosSkeletonComponent,
	],
	templateUrl: './auditoria-correos.component.html',
	styleUrl: './auditoria-correos.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditoriaCorreosComponent implements OnInit {
	private readonly facade = inject(AuditoriaCorreosFacade);

	readonly vm = this.facade.vm;

	ngOnInit(): void {
		this.facade.loadAuditoria();
	}

	refresh(): void {
		this.facade.refresh();
	}

	onSearchChange(term: string): void {
		this.facade.setSearchTerm(term);
	}

	onFilterTipoChange(tipo: TipoOrigenAuditoria | null): void {
		this.facade.setFilterTipo(tipo);
	}

	onClearFilters(): void {
		this.facade.clearFilters();
	}

	onNavegarUsuario(item: AuditoriaCorreoAsistenciaDto): void {
		void this.facade.navegarAUsuario(item);
	}
}
