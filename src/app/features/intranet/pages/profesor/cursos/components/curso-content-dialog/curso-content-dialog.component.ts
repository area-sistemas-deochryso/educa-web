import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { AccordionModule } from 'primeng/accordion';
import { TooltipModule } from 'primeng/tooltip';
import { TabsModule } from 'primeng/tabs';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { CursoContenidoDataFacade } from '../../services/curso-contenido-data.facade';
import { CursoContenidoCrudFacade } from '../../services/curso-contenido-crud.facade';
import { CursoContenidoUiFacade } from '../../services/curso-contenido-ui.facade';
import { CalificacionesFacade } from '../../services/calificaciones.facade';
import {
	CursoContenidoSemanaDto,
	CursoContenidoTareaDto,
	ActualizarTareaRequest,
	CrearTareaRequest,
	CalificacionConNotasDto,
	CalificacionDto,
	CrearCalificacionDto,
	CalificarLoteDto,
	CalificarGruposLoteDto,
	CrearPeriodoDto,
} from '../../../models';
import { SemanaEditDialogComponent } from '../semana-edit-dialog/semana-edit-dialog.component';
import { TareaDialogComponent } from '../tarea-dialog/tarea-dialog.component';
import { ArchivosSummaryDialogComponent } from '../archivos-summary-dialog/archivos-summary-dialog.component';
import { TareasSummaryDialogComponent } from '../tareas-summary-dialog/tareas-summary-dialog.component';
import { StudentFilesDialogComponent } from '../student-files-dialog/student-files-dialog.component';
import { StudentTaskSubmissionsDialogComponent } from '../student-task-submissions-dialog/student-task-submissions-dialog.component';
import { CalificacionesPanelComponent } from '../calificaciones-panel/calificaciones-panel.component';
import { EvaluacionFormDialogComponent } from '../evaluacion-form-dialog/evaluacion-form-dialog.component';
import { CalificarDialogComponent } from '../calificar-dialog/calificar-dialog.component';
import { PeriodosConfigDialogComponent } from '../periodos-config-dialog/periodos-config-dialog.component';

@Component({
	selector: 'app-curso-content-dialog',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		DialogModule,
		ButtonModule,
		AccordionModule,
		TooltipModule,
		TabsModule,
		ConfirmDialogModule,
		SemanaEditDialogComponent,
		TareaDialogComponent,
		ArchivosSummaryDialogComponent,
		TareasSummaryDialogComponent,
		StudentFilesDialogComponent,
		StudentTaskSubmissionsDialogComponent,
		CalificacionesPanelComponent,
		EvaluacionFormDialogComponent,
		CalificarDialogComponent,
		PeriodosConfigDialogComponent,
	],
	providers: [ConfirmationService],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './curso-content-dialog.component.html',
	styleUrl: './curso-content-dialog.component.scss',
})
export class CursoContentDialogComponent {
	private readonly dataFacade = inject(CursoContenidoDataFacade);
	private readonly crudFacade = inject(CursoContenidoCrudFacade);
	private readonly uiFacade = inject(CursoContenidoUiFacade);
	private readonly calFacade = inject(CalificacionesFacade);
	private readonly confirmationService = inject(ConfirmationService);

	readonly vm = this.uiFacade.vm;
	readonly calVm = this.calFacade.vm;

	// #region Estado local
	readonly searchQuery = signal('');
	readonly activeTab = signal('0');
	readonly isFullscreen = signal(false);
	readonly openPanels = signal<number[]>([]);
	private activeSemanaId = signal<number | null>(null);
	private calificacionesLoaded = false;

	readonly dialogStyle = computed(() =>
		this.isFullscreen()
			? { width: '100vw', maxWidth: '100vw', height: '100vh', maxHeight: '100vh' }
			: { width: '960px', maxWidth: '95vw' },
	);
	readonly contentStyle = computed(() =>
		this.isFullscreen() ? { 'overflow-y': 'auto' } : { 'max-height': '80vh', 'overflow-y': 'auto' },
	);

	/** Students for the calificar dialog. Uses salon students or falls back to existing notas. */
	readonly estudiantesList = computed(() => {
		const salonEstudiantes = this.calVm().salonEstudiantes;
		if (salonEstudiantes.length > 0) {
			return salonEstudiantes.map((e) => ({
				id: e.estudianteId,
				nombre: e.nombreCompleto,
			}));
		}
		// Fallback: derive from existing notas
		const cal = this.calVm().selectedCalificacion;
		if (!cal) return [];
		return cal.notas.map((n) => ({ id: n.estudianteId, nombre: n.estudianteNombre }));
	});

	// #endregion
	// #region Computed
	readonly filteredSemanas = computed(() => {
		const semanas = this.vm().semanas;
		const query = this.searchQuery().toLowerCase().trim();
		if (!query) return semanas;

		return semanas.filter((s) => {
			// Week number or title
			if (`Semana ${s.numeroSemana}`.toLowerCase().includes(query)) return true;
			if (s.titulo?.toLowerCase().includes(query)) return true;

			// File names
			if (s.archivos.some((a) => a.nombreArchivo.toLowerCase().includes(query))) return true;

			// Task titles
			if (s.tareas.some((t) => t.titulo.toLowerCase().includes(query))) return true;

			// Task dates (dd/MM/yyyy format)
			if (
				s.tareas.some((t) => {
					if (!t.fechaLimite) return false;
					const formatted = new Date(t.fechaLimite).toLocaleDateString('es-PE');
					return formatted.includes(query);
				})
			)
				return true;

			return false;
		});
	});

	// #endregion
	// #region Dialog handlers
	toggleFullscreen(): void {
		this.isFullscreen.update((v) => !v);
	}

	onVisibleChange(visible: boolean): void {
		if (!visible) {
			this.uiFacade.closeContentDialog();
			this.calFacade.resetCalificaciones();
			this.searchQuery.set('');
			this.activeTab.set('0');
			this.isFullscreen.set(false);
			this.openPanels.set([]);
			this.calificacionesLoaded = false;
		}
	}

	onDialogShow(): void {
		// Check if an initial tab was requested (e.g., from horarios navigation)
		const initialTab = this.vm().initialTab;
		if (initialTab) {
			this.activeTab.set(initialTab);
			this.onTabChange(initialTab);
			this.uiFacade.clearInitialTab();
		}
	}

	// #endregion
	// #region Semana actions
	onEditSemana(semana: CursoContenidoSemanaDto): void {
		this.uiFacade.openSemanaEditDialog(semana);
	}

	onSemanaEditVisibleChange(visible: boolean): void {
		if (!visible) {
			this.uiFacade.closeSemanaEditDialog();
		}
	}

	onSaveSemana(request: { titulo: string | null; descripcion: string | null; mensajeDocente: string | null }): void {
		const semana = this.vm().selectedSemana;
		if (semana) {
			this.crudFacade.actualizarSemana(semana.id, request);
		}
	}

	// #endregion
	// #region Archivo actions
	onNativeFileSelect(event: Event, semanaId: number): void {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) {
			this.activeSemanaId.set(semanaId);
			this.crudFacade.uploadArchivo(semanaId, file);
		}
		input.value = '';
	}

	onDeleteArchivo(semanaId: number, archivoId: number, nombreArchivo: string): void {
		this.confirmationService.confirm({
			message: `¿Eliminar el archivo "${nombreArchivo}"?`,
			header: 'Confirmar Eliminación',
			icon: 'pi pi-exclamation-triangle',
			acceptLabel: 'Eliminar',
			rejectLabel: 'Cancelar',
			acceptButtonStyleClass: 'p-button-danger',
			accept: () => {
				this.crudFacade.eliminarArchivo(semanaId, archivoId);
			},
		});
	}

	openArchivo(url: string): void {
		window.open(url, '_blank');
	}

	// #endregion
	// #region Tarea archivo actions
	onNativeTareaFileSelect(event: Event, semanaId: number, tareaId: number): void {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) {
			this.crudFacade.uploadTareaArchivo(semanaId, tareaId, file);
		}
		input.value = '';
	}

	onDeleteTareaArchivo(semanaId: number, tareaId: number, archivoId: number, nombreArchivo: string): void {
		this.confirmationService.confirm({
			message: `¿Eliminar el archivo "${nombreArchivo}"?`,
			header: 'Confirmar Eliminación',
			icon: 'pi pi-exclamation-triangle',
			acceptLabel: 'Eliminar',
			rejectLabel: 'Cancelar',
			acceptButtonStyleClass: 'p-button-danger',
			accept: () => {
				this.crudFacade.eliminarTareaArchivo(semanaId, tareaId, archivoId);
			},
		});
	}

	// #endregion
	// #region Tarea actions
	onAddTarea(): void {
		this.uiFacade.openTareaDialog(null);
	}

	onEditTarea(tarea: CursoContenidoTareaDto): void {
		this.uiFacade.openTareaDialog(tarea);
	}

	onTareaVisibleChange(visible: boolean): void {
		if (!visible) {
			this.uiFacade.closeTareaDialog();
		}
	}

	onCreateTarea(request: CrearTareaRequest): void {
		const semana = this.getActiveSemanaForTarea();
		if (semana) {
			this.crudFacade.crearTarea(semana.id, request);
		}
	}

	onUpdateTarea(request: ActualizarTareaRequest): void {
		const semana = this.getActiveSemanaForTarea();
		const tarea = this.vm().selectedTarea;
		if (semana && tarea) {
			this.crudFacade.actualizarTarea(semana.id, tarea.id, request);
		}
	}

	onDeleteTarea(semanaId: number, tareaId: number, titulo: string): void {
		this.confirmationService.confirm({
			message: `¿Eliminar la tarea "${titulo}"?`,
			header: 'Confirmar Eliminación',
			icon: 'pi pi-exclamation-triangle',
			acceptLabel: 'Eliminar',
			rejectLabel: 'Cancelar',
			acceptButtonStyleClass: 'p-button-danger',
			accept: () => {
				this.crudFacade.eliminarTarea(semanaId, tareaId);
			},
		});
	}

	// #endregion
	// #region Sub-modal handlers
	onOpenArchivosSummary(): void {
		this.uiFacade.openArchivosSummaryDialog();
	}

	onArchivosSummaryVisibleChange(visible: boolean): void {
		if (!visible) {
			this.uiFacade.closeArchivosSummaryDialog();
		}
	}

	onOpenTareasSummary(): void {
		this.uiFacade.openTareasSummaryDialog();
	}

	onTareasSummaryVisibleChange(visible: boolean): void {
		if (!visible) {
			this.uiFacade.closeTareasSummaryDialog();
		}
	}

	onOpenStudentFiles(): void {
		const contenido = this.vm().contenido;
		if (contenido) {
			this.uiFacade.openStudentFilesDialog(contenido.id);
		}
	}

	onStudentFilesVisibleChange(visible: boolean): void {
		if (!visible) {
			this.uiFacade.closeStudentFilesDialog();
		}
	}

	onStudentFilesIrACalificaciones(): void {
		this.uiFacade.closeStudentFilesDialog();
		this.onTabChange('1');
	}

	onViewTaskSubmissions(tarea: CursoContenidoTareaDto): void {
		this.uiFacade.openTaskSubmissionsDialog(tarea);
	}

	onTaskSubmissionsVisibleChange(visible: boolean): void {
		if (!visible) {
			this.uiFacade.closeTaskSubmissionsDialog();
		}
	}

	onTaskSubmissionsIrACalificaciones(): void {
		this.uiFacade.closeTaskSubmissionsDialog();
		this.onTabChange('1');
	}

	// #endregion
	// #region Refresh handlers
	onRefreshContenido(): void {
		this.dataFacade.refreshContenido();
	}

	onRefreshCalificaciones(): void {
		const contenido = this.vm().contenido;
		if (contenido) {
			this.calFacade.loadCalificaciones(contenido.id);
		}
	}

	// #endregion

	// #region Tab handlers
	onTabChange(value: string): void {
		this.activeTab.set(value);
		if (value === '1' && !this.calificacionesLoaded) {
			const contenido = this.vm().contenido;
			if (contenido) {
				this.calFacade.loadCalificaciones(contenido.id);
				this.calificacionesLoaded = true;
			}
		}
	}

	// #endregion
	// #region Calificaciones handlers
	onCrearEvaluacion(): void {
		this.calFacade.openCalificacionDialog();
	}

	onEditarEvaluacion(cal: CalificacionDto): void {
		this.calFacade.openCalificacionDialog(cal);
	}

	onCalificarEstudiantes(cal: CalificacionConNotasDto): void {
		this.calFacade.openCalificarDialog(cal);
	}

	onEliminarEvaluacion(cal: CalificacionConNotasDto): void {
		this.confirmationService.confirm({
			message: `¿Eliminar la evaluación "${cal.titulo}"? Se eliminarán todas las notas asociadas.`,
			header: 'Confirmar Eliminación',
			icon: 'pi pi-exclamation-triangle',
			acceptLabel: 'Eliminar',
			rejectLabel: 'Cancelar',
			acceptButtonStyleClass: 'p-button-danger',
			accept: () => {
				this.calFacade.eliminarCalificacion(cal.id);
			},
		});
	}

	onCambiarTipo(cal: CalificacionConNotasDto): void {
		const nuevoTipo = cal.esGrupal ? 'individual' : 'grupal';
		this.confirmationService.confirm({
			message: `¿Cambiar "${cal.titulo}" a ${nuevoTipo}? Las notas existentes se migrarán automáticamente.`,
			header: 'Cambiar tipo de evaluación',
			icon: 'pi pi-info-circle',
			acceptLabel: 'Cambiar',
			rejectLabel: 'Cancelar',
			accept: () => {
				this.calFacade.cambiarTipo(cal.id, { esGrupal: !cal.esGrupal });
			},
		});
	}

	onConfigurarPeriodos(): void {
		this.calFacade.openPeriodosDialog();
	}

	onCalificacionDialogVisibleChange(visible: boolean): void {
		if (!visible) this.calFacade.closeCalificacionDialog();
	}

	onSaveEvaluacion(dto: CrearCalificacionDto): void {
		this.calFacade.crearCalificacion(dto);
	}

	onCalificarDialogVisibleChange(visible: boolean): void {
		if (!visible) this.calFacade.closeCalificarDialog();
	}

	onSaveCalificaciones(dto: CalificarLoteDto): void {
		const cal = this.calVm().selectedCalificacion;
		const contenido = this.vm().contenido;
		if (cal && contenido) {
			this.calFacade.calificarLote(cal.id, dto, contenido.id);
		}
	}

	onSaveCalificacionesGrupos(dto: CalificarGruposLoteDto): void {
		const cal = this.calVm().selectedCalificacion;
		const contenido = this.vm().contenido;
		if (cal && contenido) {
			this.calFacade.calificarGruposLote(cal.id, dto, contenido.id);
		}
	}

	onPeriodosDialogVisibleChange(visible: boolean): void {
		if (!visible) this.calFacade.closePeriodosDialog();
	}

	onCrearPeriodo(dto: CrearPeriodoDto): void {
		this.calFacade.crearPeriodo(dto);
	}

	onEliminarPeriodo(periodoId: number): void {
		this.calFacade.eliminarPeriodo(periodoId);
	}

	// #endregion
	// #region Contenido actions
	onDeleteContenido(): void {
		const contenido = this.vm().contenido;
		if (!contenido) return;

		this.confirmationService.confirm({
			message: '¿Eliminar todo el contenido de este curso? Esta acción no se puede deshacer.',
			header: 'Eliminar Contenido',
			icon: 'pi pi-exclamation-triangle',
			acceptLabel: 'Eliminar',
			rejectLabel: 'Cancelar',
			acceptButtonStyleClass: 'p-button-danger',
			accept: () => {
				this.dataFacade.eliminarContenido(contenido.id);
			},
		});
	}

	// #endregion
	// #region Helpers
	getFileIcon(tipoArchivo: string | null): string {
		if (!tipoArchivo) return 'pi pi-file';
		if (tipoArchivo.includes('pdf')) return 'pi pi-file-pdf';
		if (tipoArchivo.includes('image')) return 'pi pi-image';
		if (tipoArchivo.includes('video')) return 'pi pi-video';
		if (tipoArchivo.includes('word') || tipoArchivo.includes('document')) return 'pi pi-file-word';
		if (tipoArchivo.includes('excel') || tipoArchivo.includes('sheet')) return 'pi pi-file-excel';
		if (tipoArchivo.includes('presentation') || tipoArchivo.includes('powerpoint')) return 'pi pi-file';
		return 'pi pi-file';
	}

	getFileIconClass(tipoArchivo: string | null): string {
		if (!tipoArchivo) return 'generic';
		if (tipoArchivo.includes('pdf')) return 'pdf';
		if (tipoArchivo.includes('image')) return 'image';
		if (tipoArchivo.includes('video')) return 'video';
		if (tipoArchivo.includes('word') || tipoArchivo.includes('document')) return 'word';
		if (tipoArchivo.includes('excel') || tipoArchivo.includes('sheet')) return 'excel';
		return 'generic';
	}

	formatFileSize(bytes: number | null): string {
		if (!bytes) return '';
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / 1048576).toFixed(1)} MB`;
	}

	setActiveSemanaForTarea(semana: CursoContenidoSemanaDto): void {
		this.activeSemanaId.set(semana.id);
	}

	private getActiveSemanaForTarea(): CursoContenidoSemanaDto | null {
		const id = this.activeSemanaId();
		if (!id) return null;
		return this.vm().semanas.find((s) => s.id === id) ?? null;
	}
	// #endregion
}
