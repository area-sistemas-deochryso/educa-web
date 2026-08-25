// #region Imports
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';

import { CapabilityCatalogItem, PermissionsService } from '@core/services/permissions';
import { RolService } from '@core/services/roles';
import { logger } from '@core/helpers';
import { PageHeaderComponent } from '@intranet-shared/components';

import { ExplicacionAdminFormDialogComponent } from './components/explicacion-admin-form-dialog/explicacion-admin-form-dialog.component';
import { ExplicacionAdminTableComponent } from './components/explicacion-admin-table/explicacion-admin-table.component';
import {
	ActualizarExplicacionRequest,
	CrearExplicacionRequest,
	ExplicacionAdminDto,
} from './models/explicacion-admin.models';
import { ExplicacionAdminFacade } from './services/explicacion-admin.facade';
import { EduButton, EduConfirmDialog, EduConfirmationService, EduInputText, EduMessageService, EduToast, EduTooltip } from '@edu-ui';
// #endregion

/**
 * Vista administrativa del contenido explicativo del modo informativo
 * (`EXPLICACIONES_MANAGE`, brief 525, plan xrepo-96 F3). Ruta `intranet/admin/explicaciones`
 * — el acceso ya lo gatea `permissionsGuard` comparando esa ruta contra la capability
 * `EXPLICACIONES_MANAGE` (seed en `Educa.API/Migrations/Manual/20260805_CreateExplicacionesTable.sql`).
 * Panel propio, separado del admin de FAQ (`ayuda-faq-admin`) — conceptos distintos.
 */
@Component({
	selector: 'app-explicaciones-admin',
	standalone: true,
	imports: [FormsModule, EduButton, EduInputText, EduToast, EduTooltip, EduConfirmDialog, PageHeaderComponent, ExplicacionAdminTableComponent, ExplicacionAdminFormDialogComponent],
	providers: [ExplicacionAdminFacade, EduConfirmationService, EduMessageService],
	templateUrl: './explicaciones-admin.component.html',
	styleUrl: './explicaciones-admin.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExplicacionesAdminComponent implements OnInit {
	// #region Dependencies
	protected readonly facade = inject(ExplicacionAdminFacade);
	protected readonly rolService = inject(RolService);
	private readonly permissionsService = inject(PermissionsService);
	private readonly confirmationService = inject(EduConfirmationService);
	private readonly destroyRef = inject(DestroyRef);
	// #endregion

	// #region State
	readonly capabilities = signal<CapabilityCatalogItem[]>([]);
	readonly dialogVisible = signal(false);
	readonly selectedExplicacion = signal<ExplicacionAdminDto | null>(null);
	// #endregion

	ngOnInit(): void {
		this.facade.init();
		this.rolService.refresh();
		this.loadCapabilities();
	}

	// #region Search
	onSearchChange(term: string): void {
		this.facade.setSearchTerm(term);
	}
	// #endregion

	// #region Dialog
	onOpenCreate(): void {
		this.selectedExplicacion.set(null);
		this.dialogVisible.set(true);
	}

	onOpenEdit(explicacion: ExplicacionAdminDto): void {
		this.selectedExplicacion.set(explicacion);
		this.dialogVisible.set(true);
	}

	onDialogVisibleChange(visible: boolean): void {
		this.dialogVisible.set(visible);
		if (!visible) this.selectedExplicacion.set(null);
	}

	onDialogCancel(): void {
		this.dialogVisible.set(false);
		this.selectedExplicacion.set(null);
	}

	onDialogSave(event: { id: number | null; request: CrearExplicacionRequest | ActualizarExplicacionRequest }): void {
		const closeDialog = (): void => {
			this.dialogVisible.set(false);
			this.selectedExplicacion.set(null);
		};

		if (event.id === null) {
			this.facade.crear(event.request as CrearExplicacionRequest, closeDialog);
		} else {
			this.facade.actualizar(event.id, event.request as ActualizarExplicacionRequest, closeDialog);
		}
	}
	// #endregion

	// #region Delete
	onRemove(explicacion: ExplicacionAdminDto): void {
		this.confirmationService.confirm({
			header: 'Eliminar explicación',
			// BE serializa con NullValueHandling.Ignore — rolId null llega como `undefined`,
			// no `null` (mismo motivo que en explicacion-admin-form-dialog.component.ts).
			message: `¿Estás seguro de eliminar la explicación de "${explicacion.ancla}"${!explicacion.rolId ? ' (default)' : ` para el rol ${explicacion.rolNombre}`}?`,
			acceptLabel: 'Eliminar',
			rejectLabel: 'Cancelar',
			acceptButtonStyleClass: 'p-button-danger',
			rejectButtonStyleClass: 'p-button-text',
			icon: 'pi pi-exclamation-triangle',
			accept: () => this.facade.eliminar(explicacion, () => {}),
		});
	}
	// #endregion

	// #region Private helpers
	private loadCapabilities(): void {
		this.permissionsService
			.getCapabilityCatalog()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (catalog) => this.capabilities.set(catalog),
				error: (err) => {
					logger.warn('[ExplicacionesAdminComponent] Error cargando catálogo de capabilities', err?.status);
					this.capabilities.set([]);
				},
			});
	}
	// #endregion
}
