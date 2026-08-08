// #region Imports
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';

import { CapabilityCatalogItem, PermissionsService } from '@core/services/permissions';
import { logger } from '@core/helpers';
import { PageHeaderComponent } from '@intranet-shared/components';

import { FaqAdminFormDialogComponent } from './components/faq-admin-form-dialog/faq-admin-form-dialog.component';
import { FaqAdminTableComponent } from './components/faq-admin-table/faq-admin-table.component';
import {
	ActualizarFaqRequest,
	CrearFaqRequest,
	FaqAdminDto,
} from './models/faq-admin.models';
import { FaqAdminFacade } from './services/faq-admin.facade';
// #endregion

/**
 * Vista administrativa de FAQ + wizard (`AYUDA_MANAGE`, xrepo-panel-ayuda-intranet F7b).
 * Ruta `intranet/admin/ayuda/faq` — el acceso ya lo gatea `permissionsGuard`
 * comparando esa ruta contra la capability `AYUDA_MANAGE` (seed en
 * `Educa.API/Migrations/Manual/20260724_CreateFaqWizardTables.sql`).
 */
@Component({
	selector: 'app-ayuda-faq-admin',
	standalone: true,
	imports: [
		FormsModule,
		ButtonModule,
		InputTextModule,
		ToastModule,
		TooltipModule,
		ConfirmDialogModule,
		PageHeaderComponent,
		FaqAdminTableComponent,
		FaqAdminFormDialogComponent,
	],
	providers: [FaqAdminFacade, ConfirmationService, MessageService],
	templateUrl: './ayuda-faq-admin.component.html',
	styleUrl: './ayuda-faq-admin.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AyudaFaqAdminComponent implements OnInit {
	// #region Dependencies
	protected readonly facade = inject(FaqAdminFacade);
	private readonly permissionsService = inject(PermissionsService);
	private readonly confirmationService = inject(ConfirmationService);
	private readonly destroyRef = inject(DestroyRef);
	// #endregion

	// #region State
	readonly capabilities = signal<CapabilityCatalogItem[]>([]);
	readonly dialogVisible = signal(false);
	readonly selectedFaq = signal<FaqAdminDto | null>(null);
	// #endregion

	ngOnInit(): void {
		this.facade.init();
		this.loadCapabilities();
	}

	// #region Search
	onSearchChange(term: string): void {
		this.facade.setSearchTerm(term);
	}
	// #endregion

	// #region Dialog
	onOpenCreate(): void {
		this.selectedFaq.set(null);
		this.dialogVisible.set(true);
	}

	onOpenEdit(faq: FaqAdminDto): void {
		this.selectedFaq.set(faq);
		this.dialogVisible.set(true);
	}

	onDialogVisibleChange(visible: boolean): void {
		this.dialogVisible.set(visible);
		if (!visible) this.selectedFaq.set(null);
	}

	onDialogCancel(): void {
		this.dialogVisible.set(false);
		this.selectedFaq.set(null);
	}

	onDialogSave(event: { id: number | null; request: CrearFaqRequest | ActualizarFaqRequest }): void {
		const closeDialog = (): void => {
			this.dialogVisible.set(false);
			this.selectedFaq.set(null);
		};

		if (event.id === null) {
			this.facade.crear(event.request as CrearFaqRequest, closeDialog);
		} else {
			this.facade.actualizar(event.id, event.request as ActualizarFaqRequest, closeDialog);
		}
	}
	// #endregion

	// #region Delete
	onRemove(faq: FaqAdminDto): void {
		this.confirmationService.confirm({
			header: 'Eliminar FAQ',
			message: `¿Estás seguro de eliminar "${faq.pregunta}"? Dejará de estar visible en la sección pública de ayuda.`,
			acceptLabel: 'Eliminar',
			rejectLabel: 'Cancelar',
			acceptButtonStyleClass: 'p-button-danger',
			rejectButtonStyleClass: 'p-button-text',
			icon: 'pi pi-exclamation-triangle',
			accept: () => this.facade.eliminar(faq, () => {}),
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
					logger.warn('[AyudaFaqAdminComponent] Error cargando catálogo de capabilities', err?.status);
					this.capabilities.set([]);
				},
			});
	}
	// #endregion
}
