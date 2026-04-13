import { Component, ChangeDetectionStrategy, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

import {
	HealthExitPermissionDto,
	HealthJustificationDto,
	StudentForHealthDto,
	SymptomDto,
	DateValidationResult,
} from '@features/intranet/pages/profesor/models';
import { HealthExitListComponent } from './components/health-exit-list.component';
import { HealthJustificationListComponent } from './components/health-justification-list.component';
import { HealthExitDialogComponent } from './components/health-exit-dialog.component';
import { HealthJustificationDialogComponent } from './components/health-justification-dialog.component';

@Component({
	selector: 'app-salon-health-permissions-tab',
	standalone: true,
	imports: [
		CommonModule,
		ButtonModule,
		TooltipModule,
		ConfirmDialogModule,
		HealthExitListComponent,
		HealthJustificationListComponent,
		HealthExitDialogComponent,
		HealthJustificationDialogComponent,
	],
	providers: [ConfirmationService],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<!-- #region Header + Acciones -->
		<div class="health-tab-header">
			<div class="health-tab-actions">
				<button
					pButton
					label="Permiso de Salida"
					icon="pi pi-sign-out"
					class="p-button-outlined p-button-sm"
					(click)="openExitDialog.emit()"
					pTooltip="Emitir permiso de salida por salud (solo hoy)"
					tooltipPosition="top"
				></button>
				<button
					pButton
					label="Justificación Médica"
					icon="pi pi-file-plus"
					class="p-button-outlined p-button-sm p-button-secondary"
					(click)="openJustificationDialog.emit()"
					pTooltip="Justificar faltas con documento médico"
					tooltipPosition="top"
				></button>
			</div>
		</div>
		<!-- #endregion -->

		<!-- #region Lista Permisos de Salida -->
		<h4 class="section-title">Permisos de Salida</h4>
		<app-health-exit-list
			[permisos]="permisosSalida()"
			[loading]="loading()"
			(anular)="anularPermiso.emit($event)"
		/>
		<!-- #endregion -->

		<!-- #region Lista Justificaciones -->
		<h4 class="section-title" style="margin-top: 1.5rem">Justificaciones Médicas</h4>
		<app-health-justification-list
			[justificaciones]="justificaciones()"
			[loading]="loading()"
			(anular)="anularJustificacion.emit($event)"
		/>
		<!-- #endregion -->

		<!-- #region Dialogs -->
		<app-health-exit-dialog
			[visible]="exitDialogVisible()"
			[estudiantes]="estudiantesConEntrada()"
			[sintomas]="sintomas()"
			[saving]="saving()"
			[salonId]="salonId()"
			(visibleChange)="exitDialogVisibleChange.emit($event)"
			(save)="saveExitPermission.emit($event)"
		/>
		<app-health-justification-dialog
			[visible]="justificationDialogVisible()"
			[estudiantes]="estudiantes()"
			[fechasValidacion]="fechasValidacion()"
			[saving]="saving()"
			[salonId]="salonId()"
			(visibleChange)="justificationDialogVisibleChange.emit($event)"
			(save)="saveJustification.emit($event)"
			(validateDates)="validateDates.emit($event)"
		/>
		<p-confirmDialog (onHide)="confirmDialogHide.emit()" />
		<!-- #endregion -->
	`,
	styles: [
		`
			.health-tab-header {
				display: flex;
				justify-content: flex-end;
				margin-bottom: 1rem;
			}

			.health-tab-actions {
				display: flex;
				gap: 0.5rem;
			}

			.section-title {
				margin: 0 0 0.5rem;
				color: var(--text-color);
				font-size: 1rem;
				font-weight: 600;
			}
		`,
	],
})
export class SalonHealthPermissionsTabComponent {
	// #region Inputs
	readonly salonId = input.required<number>();
	readonly permisosSalida = input<HealthExitPermissionDto[]>([]);
	readonly justificaciones = input<HealthJustificationDto[]>([]);
	readonly estudiantes = input<StudentForHealthDto[]>([]);
	readonly estudiantesConEntrada = input<StudentForHealthDto[]>([]);
	readonly sintomas = input<SymptomDto[]>([]);
	readonly fechasValidacion = input<DateValidationResult[]>([]);
	readonly loading = input(false);
	readonly saving = input(false);
	readonly exitDialogVisible = input(false);
	readonly justificationDialogVisible = input(false);
	// #endregion

	// #region Outputs
	readonly openExitDialog = output<void>();
	readonly openJustificationDialog = output<void>();
	readonly exitDialogVisibleChange = output<boolean>();
	readonly justificationDialogVisibleChange = output<boolean>();
	readonly saveExitPermission = output<{ estudianteId: number; sintomas: string[]; sintomaDetalle?: string; observacion?: string }>();
	readonly saveJustification = output<FormData>();
	readonly anularPermiso = output<number>();
	readonly anularJustificacion = output<number>();
	readonly validateDates = output<{ estudianteId: number; fechas: Date[] }>();
	readonly confirmDialogHide = output<void>();
	// #endregion
}
