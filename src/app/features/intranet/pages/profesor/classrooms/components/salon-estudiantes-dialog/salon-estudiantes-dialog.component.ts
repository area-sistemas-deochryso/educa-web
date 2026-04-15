import { Component, ChangeDetectionStrategy, input, output, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { environment } from '@config/environment';
import { ProfesorSalonConEstudiantes } from '@features/intranet/pages/profesor/models';
import { ClassroomGradesTabComponent } from '../salon-notas-tab/salon-notas-tab.component';
import { SalonNotasEstudianteTabComponent } from '../salon-notas-estudiante-tab/salon-notas-estudiante-tab.component';
import { SalonGruposTabComponent } from '../salon-grupos-tab/salon-grupos-tab.component';
import { CampusNavigationComponent } from '@features/intranet/pages/cross-role/campus-navigation/campus-navigation.component';
import { SalonHealthPermissionsTabComponent } from '../salon-health-permissions-tab/salon-health-permissions-tab.component';
import {
	SalonNotasResumenDto,
	VistaPromedio,
	GrupoContenidoDto,
	EstudianteSinGrupoDto,
	HealthExitPermissionDto,
	HealthJustificationDto,
	StudentForHealthDto,
	SymptomDto,
	DateValidationResult,
} from '@features/intranet/pages/profesor/models';
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
		SalonHealthPermissionsTabComponent,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './salon-estudiantes-dialog.component.html',
	styleUrl: './salon-estudiantes-dialog.component.scss',
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

	// #region Health inputs
	readonly healthPermisosSalida = input<HealthExitPermissionDto[]>([]);
	readonly healthJustificaciones = input<HealthJustificationDto[]>([]);
	readonly healthEstudiantes = input<StudentForHealthDto[]>([]);
	readonly healthEstudiantesConEntrada = input<StudentForHealthDto[]>([]);
	readonly healthSintomas = input<SymptomDto[]>([]);
	readonly healthFechasValidacion = input<DateValidationResult[]>([]);
	readonly healthLoading = input(false);
	readonly healthSaving = input(false);
	readonly healthExitDialogVisible = input(false);
	readonly healthJustificationDialogVisible = input(false);
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
	readonly healthTabActivated = output<void>();
	readonly healthOpenExitDialog = output<void>();
	readonly healthOpenJustificationDialog = output<void>();
	readonly healthExitDialogVisibleChange = output<boolean>();
	readonly healthJustificationDialogVisibleChange = output<boolean>();
	readonly healthSaveExitPermission = output<{ estudianteId: number; sintomas: string[]; sintomaDetalle?: string; observacion?: string }>();
	readonly healthSaveJustification = output<FormData>();
	readonly healthAnularPermiso = output<number>();
	readonly healthAnularJustificacion = output<number>();
	readonly healthValidateDates = output<{ estudianteId: number; fechas: Date[] }>();
	readonly healthConfirmDialogHide = output<void>();
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
		if (value === '4') {
			this.healthTabActivated.emit();
		}
	}

	onRefreshGrupos(): void {
		this.gruposRefresh.emit();
	}

	onRefreshNotas(): void {
		this.notasRefresh.emit();
	}
}
