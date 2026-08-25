import { Component, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PageHeaderComponent, PickerGridComponent } from '@intranet-shared/components';

import { AdminHealthPermissionsFacade } from './services/admin-health-permissions.facade';
// eslint-disable-next-line layer-enforcement/imports-error -- Razón: health-permissions es concepto cross-role (admin supervisa lo que profesor gestiona). Ubicación física bajo profesor/ es histórica; migración a @intranet-shared diferida (ver maestro F3.5.C notas de seguimiento).
import { CreateHealthExitRequest } from '@features/intranet/pages/profesor/models';
// eslint-disable-next-line layer-enforcement/imports-error -- Razón: tab compartido entre admin (supervisión) y profesor (gestión); migración a @intranet-shared diferida.
import { SalonHealthPermissionsTabComponent } from '@features/intranet/pages/profesor/classrooms/components/salon-health-permissions-tab/salon-health-permissions-tab.component';
import { EduButton, EduSpinner } from '@edu-ui';

@Component({
	selector: 'app-admin-health-permissions',
	standalone: true,
	imports: [CommonModule, FormsModule, EduButton, EduSpinner, PageHeaderComponent, PickerGridComponent, SalonHealthPermissionsTabComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<app-page-header icon="pi pi-heart" title="Permisos de Salud" subtitle="Administra los permisos de salud registrados por estudiante" />

		<div class="p-4 pt-0">
			<!-- #region Selector de salon -->
			<div class="salon-selector">
				<label class="font-semibold">Salón</label>
				<app-picker-grid
					[options]="vm().salonOptions"
					[selected]="vm().selectedSalonId"
					[loading]="vm().salonesLoading"
					searchPlaceholder="Buscar salón..."
					emptyMessage="Sin salones"
					ariaLabel="Seleccionar salón"
					data-info-anchor="salon-picker-grid"
					(selectionChange)="onSalonChange($event)"
				/>
			</div>
			<!-- #endregion -->

			<!-- #region Contenido -->
			@if (!vm().selectedSalonId) {
				<div class="empty-state">
					<i class="pi pi-info-circle text-3xl mb-2"></i>
					<p>Seleccione un salón para gestionar permisos de salud</p>
				</div>
			} @else if (vm().loadError) {
				<div class="empty-state empty-state--error">
					<i class="pi pi-exclamation-triangle text-3xl mb-2"></i>
					<p>No se pudo cargar la información de este salón</p>
					<edu-button
						label="Reintentar"
						icon="pi pi-refresh"
						[outlined]="true"
						size="small"
						class="mt-2"
						data-info-anchor="reintentar"
						(click)="facade.loadResumen(vm().selectedSalonId!)"
					/>
				</div>
			} @else {
				<app-salon-health-permissions-tab
					[salonId]="vm().selectedSalonId!"
					[permisosSalida]="vm().permisosSalida"
					[justificaciones]="vm().justificaciones"
					[estudiantes]="vm().estudiantes"
					[estudiantesConEntrada]="vm().estudiantesConEntrada"
					[sintomas]="vm().sintomas"
					[fechasValidacion]="vm().fechasValidacion"
					[loading]="vm().loading"
					[saving]="vm().saving"
					[exitDialogVisible]="vm().exitDialogVisible"
					[justificationDialogVisible]="vm().justificationDialogVisible"
					(openExitDialog)="facade.openExitDialog()"
					(openJustificationDialog)="facade.openJustificationDialog()"
					(exitDialogVisibleChange)="onExitDialogVisibleChange($event)"
					(justificationDialogVisibleChange)="onJustificationDialogVisibleChange($event)"
					(saveExitPermission)="onSaveExitPermission($event)"
					(saveJustification)="facade.crearJustificacion($event)"
					(anularPermiso)="facade.anularPermisoSalida($event)"
					(anularJustificacion)="facade.anularJustificacion($event)"
					(validateDates)="facade.validarFechas($event.estudianteId, $event.fechas)"
					(confirmDialogHide)="noOp()"
				/>
			}
			<!-- #endregion -->
		</div>
	`,
	styles: [
		`
			.salon-selector {
				display: flex;
				flex-direction: column;
				align-items: stretch;
				gap: 0.5rem;
				margin-bottom: 1.5rem;
			}

			.empty-state {
				display: flex;
				flex-direction: column;
				align-items: center;
				padding: 3rem;
				color: var(--text-color-secondary);
				text-align: center;
			}

			.empty-state--error i {
				color: var(--yellow-600);
			}

			:host ::ng-deep {
				.p-inputtext {
					background: transparent;
					color: var(--text-color);
					border-color: var(--surface-300);

					&::placeholder {
						color: var(--text-color-secondary);
					}

					&:enabled:focus {
						border-color: var(--text-color);
						box-shadow: 0 0 0 1px var(--text-color);
					}
				}
			}
		`],
})
export class AdminHealthPermissionsComponent implements OnInit {
	readonly facade = inject(AdminHealthPermissionsFacade);
	readonly vm = this.facade.vm;

	ngOnInit(): void {
		this.facade.loadSalones();
	}

	onSalonChange(salonId: number | null): void {
		if (salonId === null) return;
		this.facade.onSalonChange(salonId);
	}

	onExitDialogVisibleChange(visible: boolean): void {
		if (!visible) this.facade.closeExitDialog();
	}

	onJustificationDialogVisibleChange(visible: boolean): void {
		if (!visible) this.facade.closeJustificationDialog();
	}

	onSaveExitPermission(event: { estudianteId: number; sintomas: string[]; sintomaDetalle?: string; observacion?: string }): void {
		const salonId = this.vm().selectedSalonId;
		if (!salonId) return;
		const dto: CreateHealthExitRequest = { ...event, salonId };
		this.facade.crearPermisoSalida(dto);
	}

	noOp(): void {}
}
