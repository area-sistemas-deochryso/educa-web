// #region Imports
import { Component, ChangeDetectionStrategy, input, output, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { TabsModule } from 'primeng/tabs';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { environment } from '@config/environment';
import { EstudianteSalon, GruposResumenDto } from '../../../models';
import { EstudianteGruposTabComponent } from '../estudiante-grupos-tab/estudiante-grupos-tab.component';
import { CampusNavigationComponent } from '../../../../shared/campus-navigation/campus-navigation.component';

// #endregion
@Component({
	selector: 'app-estudiante-salon-dialog',
	standalone: true,
	imports: [
		CommonModule,
		DialogModule,
		TabsModule,
		ButtonModule,
		TooltipModule,
		EstudianteGruposTabComponent,
		CampusNavigationComponent,
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
							<i class="pi pi-users tab-icon"></i>Grupos
						</p-tab>
						@if (showCampusNav) {
							<p-tab value="1">
								<i class="pi pi-map tab-icon"></i>Ubicación
							</p-tab>
						}
					</p-tablist>

					<p-tabpanels>
						<!-- #region Tab Grupos -->
						<p-tabpanel value="0">
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

						<!-- #region Tab Ubicación -->
						@if (showCampusNav) {
							<p-tabpanel value="1">
								@if (activeTab() === '1') {
									<app-campus-navigation
										[embedded]="true"
										[targetSalonId]="s.salonId"
									/>
								}
							</p-tabpanel>
						}
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
	readonly gruposData = input<GruposResumenDto | null>(null);
	readonly gruposLoading = input<boolean>(false);
	readonly gruposCursoId = input<number | null>(null);
	// #endregion

	// #region Outputs
	readonly visibleChange = output<boolean>();
	readonly gruposChange = output<number>();
	// #endregion

	// #region Estado local
	readonly showCampusNav = environment.features.campusNavigation;
	readonly isFullscreen = signal(false);
	readonly activeTab = signal('0');

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
			this.activeTab.set('0');
			this.visibleChange.emit(false);
		}
	}

	onTabChange(value: string): void {
		this.activeTab.set(value);
	}

	onGruposCursoChange(horarioId: number): void {
		this.gruposChange.emit(horarioId);
	}

	onRefreshGrupos(): void {
		const cursoId = this.gruposCursoId();
		if (cursoId) this.gruposChange.emit(cursoId);
	}
	// #endregion
}
