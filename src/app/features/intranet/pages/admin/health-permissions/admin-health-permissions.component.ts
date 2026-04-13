import { Component, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { PageHeaderComponent } from '@shared/components';

import { AdminHealthPermissionsFacade } from './services/admin-health-permissions.facade';
import { CreateHealthExitRequest } from '@features/intranet/pages/profesor/models';
import { SalonHealthPermissionsTabComponent } from '@features/intranet/pages/profesor/classrooms/components/salon-health-permissions-tab/salon-health-permissions-tab.component';

@Component({
	selector: 'app-admin-health-permissions',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		SelectModule,
		ProgressSpinnerModule,
		PageHeaderComponent,
		SalonHealthPermissionsTabComponent,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<app-page-header icon="pi pi-heart" title="Permisos de Salud" />

		<div class="p-4 pt-0">
			<!-- #region Selector de salon -->
			<div class="salon-selector">
				<label for="salon-select" class="font-semibold">Salón</label>
				<p-select
					id="salon-select"
					[options]="vm().salonOptions"
					[ngModel]="vm().selectedSalonId"
					(ngModelChange)="onSalonChange($event)"
					optionLabel="label"
					optionValue="value"
					placeholder="Seleccionar salón..."
					[filter]="true"
					filterPlaceholder="Buscar salón..."
					appendTo="body"
					[loading]="vm().salonesLoading"
					styleClass="salon-dropdown"
				/>
			</div>
			<!-- #endregion -->

			<!-- #region Contenido -->
			@if (!vm().selectedSalonId) {
				<div class="empty-state">
					<i class="pi pi-info-circle text-3xl mb-2"></i>
					<p>Seleccione un salón para gestionar permisos de salud</p>
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
				align-items: center;
				gap: 1rem;
				margin-bottom: 1.5rem;
			}

			:host ::ng-deep .salon-dropdown {
				min-width: 320px;
			}

			.empty-state {
				display: flex;
				flex-direction: column;
				align-items: center;
				padding: 3rem;
				color: var(--text-color-secondary);
				text-align: center;
			}

			:host ::ng-deep {
				.p-inputtext,
				.p-select {
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

				.p-select-label {
					color: var(--text-color);
				}

				.p-select-dropdown {
					color: var(--text-color);
				}
			}
		`,
	],
})
export class AdminHealthPermissionsComponent implements OnInit {
	readonly facade = inject(AdminHealthPermissionsFacade);
	readonly vm = this.facade.vm;

	ngOnInit(): void {
		this.facade.loadSalones();
	}

	onSalonChange(salonId: number): void {
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
