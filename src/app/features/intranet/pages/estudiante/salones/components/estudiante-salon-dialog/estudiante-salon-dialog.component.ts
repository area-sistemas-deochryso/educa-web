// #region Imports
import { Component, ChangeDetectionStrategy, input, output, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { TabsModule } from 'primeng/tabs';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import {
	EstudianteSalon,
	MiAsistenciaCursoResumenDto,
	EstudianteMisNotasDto,
	GruposResumenDto,
} from '../../../models';
import { EstudianteAsistenciaTabComponent } from '../estudiante-asistencia-tab/estudiante-asistencia-tab.component';
import { EstudianteGruposTabComponent } from '../estudiante-grupos-tab/estudiante-grupos-tab.component';
import { EstudianteNotasSalonTabComponent } from '../estudiante-notas-salon-tab/estudiante-notas-salon-tab.component';
import { SalonMensajeriaTabComponent } from '../../../../profesor/salones/components/salon-mensajeria-tab/salon-mensajeria-tab.component';

// #endregion
@Component({
	selector: 'app-estudiante-salon-dialog',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		DialogModule,
		TabsModule,
		SelectModule,
		ButtonModule,
		TooltipModule,
		EstudianteAsistenciaTabComponent,
		EstudianteGruposTabComponent,
		EstudianteNotasSalonTabComponent,
		SalonMensajeriaTabComponent,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		:host ::ng-deep .p-datatable {
			--p-datatable-header-cell-background: transparent;
			--p-datatable-row-background: transparent;
		}
		:host ::ng-deep .p-dialog {
			transition: all 0.25s ease;
		}
		:host ::ng-deep .fullscreen-dialog {
			border-radius: 0 !important;
			margin: 0 !important;
			max-height: 100vh !important;
		}
		:host ::ng-deep .fullscreen-dialog .p-dialog-content {
			flex: 1;
			max-height: none !important;
		}
		.tab-icon {
			margin-right: 0.4rem;
			font-size: 0.85rem;
		}
		.dialog-header-custom {
			display: flex;
			align-items: center;
			gap: 0.75rem;
			width: 100%;
		}
		.dialog-header-custom .p-dialog-title {
			flex: 1;
			font-size: 1.2rem;
			font-weight: 600;
		}
		.fullscreen-toggle-btn {
			display: flex;
			align-items: center;
			justify-content: center;
			width: 2rem;
			height: 2rem;
			border-radius: 50%;
			border: none;
			background: transparent;
			color: var(--text-color-secondary);
			cursor: pointer;
			transition: background 0.15s ease, color 0.15s ease;
			flex-shrink: 0;
		}
		.fullscreen-toggle-btn i {
			font-size: 0.85rem;
		}
		.fullscreen-toggle-btn:hover {
			background: var(--surface-hover, rgba(0, 0, 0, 0.04));
			color: var(--text-color);
		}
	`,
	template: `
		<p-dialog
			[visible]="visible()"
			(visibleChange)="onVisibleChange($event)"
			[modal]="true"
			[style]="dialogStyle()"
			[contentStyle]="contentStyle()"
			[styleClass]="isFullscreen() ? 'fullscreen-dialog' : ''"
		>
			<ng-template #header>
				<div class="dialog-header-custom">
					<span class="p-dialog-title">{{ salon()?.salonDescripcion ?? 'Salón' }}</span>
					<button
						class="fullscreen-toggle-btn"
						type="button"
						(click)="toggleFullscreen()"
						[attr.aria-label]="isFullscreen() ? 'Salir de pantalla completa' : 'Expandir a pantalla completa'"
					>
						<i [class]="isFullscreen() ? 'pi pi-window-minimize' : 'pi pi-window-maximize'"></i>
					</button>
				</div>
			</ng-template>
			@if (salon(); as s) {
				<p-tabs value="0" (valueChange)="onTabChange($any($event))">
					<p-tablist>
						<p-tab value="0">
							<i class="pi pi-comments tab-icon"></i>Mensajería
						</p-tab>
						<p-tab value="1">
							<i class="pi pi-chart-bar tab-icon"></i>Mis Notas
						</p-tab>
						<p-tab value="2">
							<i class="pi pi-check-square tab-icon"></i>Mi Asistencia
						</p-tab>
						<p-tab value="3">
							<i class="pi pi-users tab-icon"></i>Grupos
						</p-tab>
					</p-tablist>

					<p-tabpanels>
						<!-- #region Tab Mensajería -->
						<p-tabpanel value="0">
							<app-salon-mensajeria-tab
								[isFullscreen]="isFullscreen()"
								[cursoOptions]="cursosOptions()"
							/>
						</p-tabpanel>
						<!-- #endregion -->

						<!-- #region Tab Mis Notas -->
						<p-tabpanel value="1">
							<div style="display: flex; justify-content: flex-end; margin-bottom: 0.5rem">
								<button
									pButton
									icon="pi pi-refresh"
									class="p-button-rounded p-button-text p-button-sm"
									(click)="onRefreshNotas()"
									[disabled]="notasLoading()"
									pTooltip="Refrescar"
									tooltipPosition="top"
									[pt]="{ root: { 'aria-label': 'Refrescar notas' } }"
								></button>
							</div>
							<app-estudiante-notas-salon-tab
								[notasData]="notasData()"
								[loading]="notasLoading()"
								[cursoOptions]="cursosOptions()"
							/>
						</p-tabpanel>
						<!-- #endregion -->

						<!-- #region Tab Mi Asistencia -->
						<p-tabpanel value="2">
							<div style="display: flex; justify-content: flex-end; margin-bottom: 0.5rem">
								<button
									pButton
									icon="pi pi-refresh"
									class="p-button-rounded p-button-text p-button-sm"
									(click)="onRefreshAsistencia()"
									[disabled]="asistenciaLoading()"
									pTooltip="Refrescar"
									tooltipPosition="top"
									[pt]="{ root: { 'aria-label': 'Refrescar asistencia' } }"
								></button>
							</div>
							<app-estudiante-asistencia-tab
								[asistenciaData]="asistenciaData()"
								[loading]="asistenciaLoading()"
								[cursoOptions]="cursosOptions()"
								[selectedCurso]="asistenciaCursoId()"
								(cursoChange)="onAsistenciaCursoChange($event)"
							/>
						</p-tabpanel>
						<!-- #endregion -->

						<!-- #region Tab Grupos -->
						<p-tabpanel value="3">
							<div style="display: flex; justify-content: flex-end; margin-bottom: 0.5rem">
								<button
									pButton
									icon="pi pi-refresh"
									class="p-button-rounded p-button-text p-button-sm"
									(click)="onRefreshGrupos()"
									[disabled]="gruposLoading()"
									pTooltip="Refrescar"
									tooltipPosition="top"
									[pt]="{ root: { 'aria-label': 'Refrescar grupos' } }"
								></button>
							</div>
							<app-estudiante-grupos-tab
								[gruposData]="gruposData()"
								[loading]="gruposLoading()"
								[cursoOptions]="cursosOptions()"
								[selectedCurso]="gruposCursoId()"
								(cursoChange)="onGruposCursoChange($event)"
							/>
						</p-tabpanel>
						<!-- #endregion -->
					</p-tabpanels>
				</p-tabs>
			}
		</p-dialog>
	`,
})
export class EstudianteSalonDialogComponent {
	// #region Inputs
	readonly visible = input.required<boolean>();
	readonly salon = input.required<EstudianteSalon | null>();
	readonly cursosOptions = input<{ label: string; value: number }[]>([]);
	readonly asistenciaData = input<MiAsistenciaCursoResumenDto | null>(null);
	readonly asistenciaLoading = input<boolean>(false);
	readonly asistenciaCursoId = input<number | null>(null);
	readonly gruposData = input<GruposResumenDto | null>(null);
	readonly gruposLoading = input<boolean>(false);
	readonly gruposCursoId = input<number | null>(null);
	readonly notasData = input<EstudianteMisNotasDto[]>([]);
	readonly notasLoading = input<boolean>(false);
	// #endregion

	// #region Outputs
	readonly visibleChange = output<boolean>();
	readonly asistenciaChange = output<number>();
	readonly gruposChange = output<number>();
	readonly notasRefresh = output<void>();
	// #endregion

	// #region Fullscreen
	readonly isFullscreen = signal(false);

	readonly dialogStyle = computed(() =>
		this.isFullscreen()
			? { width: '100vw', maxWidth: '100vw', height: '100vh', maxHeight: '100vh' }
			: { width: '700px', maxWidth: '95vw' },
	);
	readonly contentStyle = computed(() =>
		this.isFullscreen() ? { 'overflow-y': 'auto' } : { 'max-height': '80vh', 'overflow-y': 'auto' },
	);

	toggleFullscreen(): void {
		this.isFullscreen.update((v) => !v);
	}
	// #endregion

	// #region Event handlers
	onVisibleChange(value: boolean): void {
		if (!value) {
			this.isFullscreen.set(false);
			this.visibleChange.emit(false);
		}
	}

	onTabChange(value: string): void {
		if (value === '2') {
			// Mi Asistencia tab — auto-load first curso if not loaded
			const opts = this.cursosOptions();
			if (opts.length > 0 && !this.asistenciaCursoId()) {
				this.asistenciaChange.emit(opts[0].value);
			}
		}
		if (value === '3') {
			// Grupos tab — auto-load first curso if not loaded
			const opts = this.cursosOptions();
			if (opts.length > 0 && !this.gruposCursoId()) {
				this.gruposChange.emit(opts[0].value);
			}
		}
	}

	onAsistenciaCursoChange(horarioId: number): void {
		this.asistenciaChange.emit(horarioId);
	}

	onGruposCursoChange(horarioId: number): void {
		this.gruposChange.emit(horarioId);
	}

	onRefreshNotas(): void {
		this.notasRefresh.emit();
	}

	onRefreshAsistencia(): void {
		const cursoId = this.asistenciaCursoId();
		if (cursoId) this.asistenciaChange.emit(cursoId);
	}

	onRefreshGrupos(): void {
		const cursoId = this.gruposCursoId();
		if (cursoId) this.gruposChange.emit(cursoId);
	}
	// #endregion
}
