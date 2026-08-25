import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { PageHeaderComponent, KpiStatsComponent, type KpiStatItem } from '@intranet-shared/components';

import { PermissionsRolesFacade } from './services';
import type { RolCapabilityMatrixRow } from '@core/services';
import { VistasComponent } from '../vistas';
import { EduButton, EduCheckbox, EduDialog, EduDrawer, EduInputText, EduTab, EduTabPanel, EduTable, EduTabs, EduTag, EduTemplate, EduTooltip } from '@edu-ui';

@Component({
	selector: 'app-permissions-roles',
	standalone: true,
	imports: [CommonModule, FormsModule, EduTable, EduButton, EduDialog, EduTooltip, EduTag, EduInputText, EduCheckbox, EduDrawer, EduTabs, EduTab, EduTabPanel, PageHeaderComponent, KpiStatsComponent, VistasComponent, EduTemplate],
	templateUrl: './permisos-roles.component.html',
	styleUrl: './permisos-roles.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PermissionsRolesComponent implements OnInit {
	private facade = inject(PermissionsRolesFacade);
	readonly vm = this.facade.vm;
	readonly saving = signal(false);

	readonly statsItems = computed<KpiStatItem[]>(() => {
		const stats = this.vm().estadisticas;
		return [
			{ icon: 'pi pi-id-card', label: 'Roles', value: stats.totalRoles, sublabel: 'en el sistema' },
			{ icon: 'pi pi-th-large', label: 'Módulos', value: stats.totalModulos, sublabel: 'categorías' },
			{ icon: 'pi pi-shield', label: 'Capabilities', value: stats.totalCapabilities, sublabel: 'disponibles' }];
	});

	ngOnInit(): void {
		this.facade.loadAll();
	}

	refresh(): void {
		this.facade.refresh();
	}

	editRole(row: RolCapabilityMatrixRow): void {
		this.facade.openEditDialog(row);
	}

	saveCapabilities(): void {
		this.saving.set(true);
		this.facade.saveCapabilities(() => this.saving.set(false));
	}

	openDetail(row: RolCapabilityMatrixRow): void {
		this.facade.openDetail(row);
	}

	closeDetail(): void {
		this.facade.closeDetail();
	}

	editFromDetail(): void {
		this.facade.editFromDetail();
	}

	toggleCapability(capId: number): void {
		this.facade.toggleCapability(capId);
	}

	toggleAllCapabilitiesModulo(): void {
		this.facade.toggleAllCapabilitiesModulo();
	}

	onActiveModuloIndexChange(index: number): void {
		this.facade.setActiveModuloIndex(index);
	}

	onCapBusquedaChange(term: string): void {
		this.facade.setCapBusqueda(term);
	}

	onDialogVisibleChange(visible: boolean): void {
		if (!visible) {
			this.facade.closeDialog();
		}
	}

	onDrawerVisibleChange(visible: boolean): void {
		if (!visible) {
			this.facade.closeDetail();
		}
	}
}
