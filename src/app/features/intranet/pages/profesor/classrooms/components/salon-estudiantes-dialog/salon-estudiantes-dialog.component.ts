import { Component, ChangeDetectionStrategy, input, output, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { environment } from '@config/environment';
import { ProfesorSalonConEstudiantes } from '../../../services/profesor.store';
import { ClassroomGradesTabComponent } from '../salon-notas-tab/salon-notas-tab.component';
import { SalonNotasEstudianteTabComponent } from '../salon-notas-estudiante-tab/salon-notas-estudiante-tab.component';
import { SalonGruposTabComponent } from '../salon-grupos-tab/salon-grupos-tab.component';
import { CampusNavigationComponent } from '../../../../cross-role/campus-navigation/campus-navigation.component';
import {
	SalonNotasResumenDto,
	VistaPromedio,
	GrupoContenidoDto,
	EstudianteSinGrupoDto,
} from '../../../models';
import { NotaSaveEvent } from '../salon-notas-estudiante-tab/salon-notas-estudiante-tab.component';

@Component({
	selector: 'app-salon-estudiantes-dialog',
	standalone: true,
	imports: [
		CommonModule,
		DialogModule,
		TabsModule,
		TagModule,
		SkeletonModule,
		ButtonModule,
		TooltipModule,
		ClassroomGradesTabComponent,
		SalonNotasEstudianteTabComponent,
		SalonGruposTabComponent,
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
							@if (!dialogLoading()) {
								<p-tag
									[value]="s.cantidadEstudiantes.toString()"
									severity="info"
									[rounded]="true"
									class="ml-2"
								/>
							}
						</p-tab>
						<p-tab value="1">
							<i class="pi pi-user tab-icon"></i>Notas por Estudiante
						</p-tab>
						<p-tab value="2">
							<i class="pi pi-book tab-icon"></i>Notas del Salón
						</p-tab>
						@if (showCampusNav) {
							<p-tab value="3">
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
							<app-salon-grupos-tab
								[grupos]="gruposData()"
								[estudiantesSinGrupo]="gruposEstudiantesSinGrupo()"
								[maxEstudiantesPorGrupo]="gruposMaxEstudiantes()"
								[loading]="gruposLoading()"
								[saving]="gruposSaving()"
								[noContenido]="gruposNoContenido()"
								[contenidoId]="gruposContenidoId()"
								[cursoOptions]="cursoOptions()"
								[selectedCurso]="gruposCursoId()"
								[asignarDialogVisible]="gruposAsignarDialogVisible()"
								[asignarGrupo]="gruposAsignarGrupo()"
								(cursoChange)="gruposCursoChange.emit($event)"
								(crearGrupo)="gruposCrearGrupo.emit($event)"
								(eliminarGrupo)="gruposEliminarGrupo.emit($event)"
								(renombrarGrupo)="gruposRenombrarGrupo.emit($event)"
								(asignarEstudiantes)="gruposAsignarEstudiantes.emit($event)"
								(removerEstudiante)="gruposRemoverEstudiante.emit($event)"
								(dropEstudiante)="gruposDropEstudiante.emit($event)"
								(configurarMax)="gruposConfigurarMax.emit($event)"
								(openAsignar)="gruposOpenAsignar.emit($event)"
								(closeAsignar)="gruposCloseAsignar.emit()"
								(confirmDialogHide)="gruposConfirmDialogHide.emit()"
							/>
						</p-tabpanel>
						<!-- #endregion -->

						<!-- #region Tab Notas por Estudiante -->
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
							<app-salon-notas-estudiante-tab
								[notasData]="notasData()"
								[loading]="notasLoading()"
								[cursoOptions]="cursoOptions()"
								[selectedCurso]="selectedCurso()"
								[estudiantes]="salon()?.estudiantes ?? []"
								(cursoChange)="notasCursoChange.emit($event)"
								(notaSave)="notaSave.emit($event)"
							/>
						</p-tabpanel>
						<!-- #endregion -->

						<!-- #region Tab Notas del Salón -->
						<p-tabpanel value="2">
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
							<app-classroom-grades-tab
								[notasData]="notasData()"
								[loading]="notasLoading()"
								[cursoOptions]="cursoOptions()"
								[selectedCurso]="selectedCurso()"
								[vistaActual]="vistaActual()"
								(cursoChange)="notasCursoChange.emit($event)"
								(vistaChange)="notasVistaChange.emit($event)"
								(descargarBoletas)="descargarBoletas.emit()"
							/>
						</p-tabpanel>
						<!-- #endregion -->

						<!-- #region Tab Ubicación -->
						@if (showCampusNav) {
							<p-tabpanel value="3">
								@if (activeTab() === '3') {
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
export class SalonEstudiantesDialogComponent {
	// #region Dialog inputs
	readonly visible = input.required<boolean>();
	readonly salon = input.required<ProfesorSalonConEstudiantes | null>();
	readonly dialogLoading = input<boolean>(false);
	readonly cursoOptions = input<{ label: string; value: number }[]>([]);
	// #endregion

	// #region Notas inputs
	readonly notasData = input<SalonNotasResumenDto | null>(null);
	readonly notasLoading = input<boolean>(false);
	readonly selectedCurso = input<number | null>(null);
	readonly vistaActual = input<VistaPromedio>('semana');
	// #endregion

	// #region Grupos inputs
	readonly gruposData = input<GrupoContenidoDto[]>([]);
	readonly gruposEstudiantesSinGrupo = input<EstudianteSinGrupoDto[]>([]);
	readonly gruposMaxEstudiantes = input<number | null>(null);
	readonly gruposLoading = input<boolean>(false);
	readonly gruposSaving = input<boolean>(false);
	readonly gruposNoContenido = input<boolean>(false);
	readonly gruposContenidoId = input<number | null>(null);
	readonly gruposCursoId = input<number | null>(null);
	readonly gruposAsignarDialogVisible = input<boolean>(false);
	readonly gruposAsignarGrupo = input<GrupoContenidoDto | null>(null);
	// #endregion

	// #region Estado local
	readonly showCampusNav = environment.features.campusNavigation;
	readonly activeTab = signal('0');
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

	// #region Outputs
	readonly visibleChange = output<boolean>();
	readonly notasCursoChange = output<number>();
	readonly notasVistaChange = output<VistaPromedio>();
	readonly notasTabActivated = output<void>();
	readonly notaSave = output<NotaSaveEvent>();
	readonly gruposCursoChange = output<number>();
	readonly gruposCrearGrupo = output<string>();
	readonly gruposEliminarGrupo = output<number>();
	readonly gruposRenombrarGrupo = output<{ grupoId: number; nombre: string }>();
	readonly gruposAsignarEstudiantes = output<{ grupoId: number; estudianteIds: number[] }>();
	readonly gruposRemoverEstudiante = output<{ grupoId: number; estudianteId: number }>();
	readonly gruposDropEstudiante = output<{ estudianteId: number; fromGrupoId: number | null; toGrupoId: number | null }>();
	readonly gruposConfigurarMax = output<number | null>();
	readonly gruposOpenAsignar = output<number>();
	readonly gruposCloseAsignar = output<void>();
	readonly gruposConfirmDialogHide = output<void>();
	readonly gruposTabActivated = output<void>();
	readonly gruposRefresh = output<void>();
	readonly notasRefresh = output<void>();
	readonly descargarBoletas = output<void>();
	// #endregion

	readonly skeletonRows = Array(5);

	onVisibleChange(value: boolean): void {
		if (!value) {
			this.isFullscreen.set(false);
			this.activeTab.set('0');
			this.visibleChange.emit(false);
		}
	}

	onTabChange(value: string): void {
		this.activeTab.set(value);
		if (value === '0') {
			this.gruposTabActivated.emit();
		}
		if (value === '1' || value === '2') {
			this.notasTabActivated.emit();
		}
	}

	onRefreshGrupos(): void {
		this.gruposRefresh.emit();
	}

	onRefreshNotas(): void {
		this.notasRefresh.emit();
	}
}
