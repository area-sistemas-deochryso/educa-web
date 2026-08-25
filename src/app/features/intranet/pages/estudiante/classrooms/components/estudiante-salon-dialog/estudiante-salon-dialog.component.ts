// #region Imports
import { Component, ChangeDetectionStrategy, input, output, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { environment } from '@config/environment';
import { detectarNivel } from '@core/helpers';
import {
	EstudianteSalon,
	GruposResumenDto,
	MiAsistenciaCursoResumenDto,
	SolicitudJustificacionAsistenciaDto,
	JustificarInasistenciaContext,
} from '@features/intranet/pages/estudiante/models';
import { EstudianteGruposTabComponent } from '../estudiante-grupos-tab/estudiante-grupos-tab.component';
import { StudentAttendanceTabComponent } from '../student-attendance-tab/student-attendance-tab.component';
import { CampusNavigationComponent } from '@features/intranet/pages/cross-role/campus-navigation/campus-navigation.component';
import { EstudianteNotasComponent } from '@features/intranet/pages/estudiante/notas/estudiante-notas.component';
import { EduButton, EduDialog, EduTab, EduTabPanel, EduTabs, EduTooltip } from '@edu-ui';

// #endregion
@Component({
	selector: 'app-estudiante-salon-dialog',
	standalone: true,
	imports: [
		CommonModule,
		EduDialog,
		EduTabs, EduTab, EduTabPanel,
		EduButton,
		EduTooltip,
		EstudianteGruposTabComponent,
		StudentAttendanceTabComponent,
		CampusNavigationComponent,
		EstudianteNotasComponent],
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
		<edu-dialog
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
						data-info-anchor="estudiante-salon-dialog-fullscreen-toggle"
						type="button"
						(click)="toggleFullscreen()"
						[attr.aria-label]="isFullscreen() ? 'Salir de pantalla completa' : 'Expandir a pantalla completa'"
					>
						<i [class]="isFullscreen() ? 'pi pi-window-minimize' : 'pi pi-window-maximize'"></i>
					</button>
				</div>
			</ng-template>
			@if (salon(); as s) {
				<edu-tabs value="0" (valueChange)="onTabChange($any($event))">
					
						<edu-tab value="0" data-info-anchor="estudiante-salon-dialog-tab">
							<i class="pi pi-users tab-icon"></i>Grupos
						</edu-tab>
						<edu-tab value="1" data-info-anchor="estudiante-salon-dialog-tab">
							<i class="pi pi-chart-bar tab-icon"></i>Notas
						</edu-tab>
						<edu-tab value="2" data-info-anchor="estudiante-salon-dialog-tab">
							<i class="pi pi-calendar-times tab-icon"></i>Asistencia
						</edu-tab>
						@if (showCampusNav) {
							<edu-tab value="3" data-info-anchor="estudiante-salon-dialog-tab">
								<i class="pi pi-map tab-icon"></i>Ubicación
							</edu-tab>
						}
					

					
						<!-- #region EduTab Grupos -->
						<edu-tabpanel value="0">
							<div style="display: flex; justify-content: flex-end; margin-bottom: 0.5rem">
								<edu-button
									icon="pi pi-refresh"
									[rounded]="true"
									[text]="true"
									size="small"
									data-info-anchor="estudiante-salon-dialog-refresh-grupos"
									(click)="onRefreshGrupos()"
									[disabled]="gruposLoading()"
									eduTooltip="Refrescar"
									eduTooltipPosition="top"
									[pt]="{ root: { 'aria-label': 'Refrescar grupos' } }"
								/>
							</div>
							<app-estudiante-grupos-tab
								[gruposData]="gruposData()"
								[loading]="gruposLoading()"
								[cursoOptions]="cursosOptions()"
								[selectedCurso]="gruposCursoId()"
								(cursoChange)="onGruposCursoChange($event)"
							/>
						</edu-tabpanel>
						<!-- #endregion -->

						<!-- #region EduTab Notas -->
						<edu-tabpanel value="1">
							@if (activeTab() === '1') {
								<app-estudiante-notas [cursoNombres]="cursoNombresOptions()" [embedded]="true" />
							}
						</edu-tabpanel>
						<!-- #endregion -->

						<!-- #region EduTab Asistencia -->
						<edu-tabpanel value="2">
							@if (activeTab() === '2') {
								<app-student-attendance-tab
									[asistenciaData]="asistenciaData()"
									[loading]="asistenciaLoading()"
									[error]="asistenciaError()"
									[cursoOptions]="cursosOptions()"
									[selectedCurso]="asistenciaCursoId()"
									[nivel]="nivel()"
									[solicitudes]="solicitudes()"
									[justificarDialogVisible]="justificarDialogVisible()"
									[justificarContext]="justificarContext()"
									[solicitudSaving]="solicitudSaving()"
									(cursoChange)="onAsistenciaCursoChange($event)"
									(retry)="onRetryAsistencia()"
									(abrirJustificar)="abrirJustificar.emit($event)"
									(justificarDialogVisibleChange)="justificarDialogVisibleChange.emit($event)"
									(guardarJustificacion)="guardarJustificacion.emit($event)"
								/>
							}
						</edu-tabpanel>
						<!-- #endregion -->

						<!-- #region EduTab Ubicación -->
						@if (showCampusNav) {
							<edu-tabpanel value="3">
								@if (activeTab() === '3') {
									<app-campus-navigation
										[embedded]="true"
										[targetSalonId]="s.salonId"
									/>
								}
							</edu-tabpanel>
						}
						<!-- #endregion -->
					
				</edu-tabs>
			}
		</edu-dialog>
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
	readonly asistenciaData = input<MiAsistenciaCursoResumenDto | null>(null);
	readonly asistenciaLoading = input<boolean>(false);
	readonly asistenciaError = input<string | null>(null);
	readonly asistenciaCursoId = input<number | null>(null);
	readonly solicitudes = input<SolicitudJustificacionAsistenciaDto[]>([]);
	readonly justificarDialogVisible = input<boolean>(false);
	readonly justificarContext = input<JustificarInasistenciaContext | null>(null);
	readonly solicitudSaving = input<boolean>(false);
	// #endregion

	// #region Outputs
	readonly visibleChange = output<boolean>();
	readonly gruposChange = output<number>();
	readonly asistenciaChange = output<number>();
	readonly abrirJustificar = output<JustificarInasistenciaContext>();
	readonly justificarDialogVisibleChange = output<boolean>();
	readonly guardarJustificacion = output<{ asistenciaCursoId: number; formData: FormData }>();
	// #endregion

	// #region Estado local
	readonly showCampusNav = environment.features.campusNavigation;
	readonly isFullscreen = signal(false);
	readonly activeTab = signal('0');

	readonly cursoNombresOptions = computed(() => this.cursosOptions().map((o) => o.label));
	readonly nivel = computed(() => {
		const descripcion = this.salon()?.salonDescripcion;
		return descripcion ? detectarNivel(descripcion) : null;
	});

	readonly dialogStyle = computed((): Record<string, string> => {
		if (this.isFullscreen()) return { width: '100vw', maxWidth: '100vw', height: '100vh', maxHeight: '100vh' };
		return { width: '700px', maxWidth: '95vw' };
	});
	readonly contentStyle = computed((): Record<string, string> => {
		if (this.isFullscreen()) return { 'overflow-y': 'auto' };
		return { 'max-height': '80vh', 'overflow-y': 'auto' };
	});

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

	onAsistenciaCursoChange(horarioId: number): void {
		this.asistenciaChange.emit(horarioId);
	}

	onRetryAsistencia(): void {
		const cursoId = this.asistenciaCursoId();
		if (cursoId) this.asistenciaChange.emit(cursoId);
	}
	// #endregion
}
