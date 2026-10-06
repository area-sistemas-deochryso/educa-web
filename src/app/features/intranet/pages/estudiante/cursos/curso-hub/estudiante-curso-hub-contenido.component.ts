import {
	ChangeDetectionStrategy,
	Component,
	computed,
	effect,
	inject,
	signal,
	untracked,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ErrorHandlerService } from '@core/services';
import { FileRowComponent, UPLOAD_ACCEPT, UPLOAD_LIMITS, validateUploadFile, FileViewerService, ViewableArchivo } from '@shared/components';
import { CursoHubContextService, EmptyStateComponent } from '@intranet-shared/components';
import { EstudianteCursosFacade } from '@features/intranet/pages/estudiante/services/estudiante-cursos.facade';
import type { EstudianteArchivoDto, EstudianteTareaArchivoDto } from '@features/intranet/pages/estudiante/models';
import {
	EduAccordion,
	EduAccordionHeader,
	EduAccordionPanel,
	EduButton,
	EduConfirmDialog,
	EduConfirmationService,
	EduFileUpload,
	type EduFileUploadSelectEvent,
	EduSpinner,
	EduTooltip,
} from '@edu-ui';

/**
 * Pestaña Contenido del hub de curso del estudiante (`…/contenido`): consulta
 * el contenido de la franja y entrega archivos/tareas.
 *
 * Implementación propia del hub (decisión de F1b: duplicación temporal hasta F6).
 * El shell del hub carga y limpia el store; esta pestaña solo lo lee.
 *
 * Los estilos son los del modal de solo lectura: se referencian en lugar de
 * copiarse; al retirar el modal (F6) el scss debe moverse a esta carpeta.
 */
@Component({
	selector: 'app-estudiante-curso-hub-contenido',
	standalone: true,
	imports: [
		DatePipe,
		FormsModule,
		EduAccordion,
		EduAccordionHeader,
		EduAccordionPanel,
		EduButton,
		EduConfirmDialog,
		EduFileUpload,
		EduSpinner,
		EduTooltip,
		EmptyStateComponent,
		FileRowComponent,
	],
	providers: [EduConfirmationService],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './estudiante-curso-hub-contenido.component.html',
	styleUrl: './curso-hub-content.scss',
})
export class EstudianteCursoHubContenidoComponent {
	private readonly viewer = inject(FileViewerService);
	// #region Dependencias
	private readonly hubContext = inject(CursoHubContextService);
	private readonly facade = inject(EstudianteCursosFacade);
	private readonly confirmationService = inject(EduConfirmationService);
	private readonly errorHandler = inject(ErrorHandlerService);
	protected readonly uploadAccept = UPLOAD_ACCEPT;
	protected readonly uploadMaxBytes = UPLOAD_LIMITS.maxFileSizeBytes;
	// #endregion

	// #region Estado
	protected readonly vm = this.facade.vm;
	protected readonly searchQuery = signal('');
	protected readonly openPanels = signal<number[]>([]);
	// edu-accordion's [value] is string-based — semana ids are numeric, so this bridges the two.
	protected readonly openPanelsStr = computed(() => this.openPanels().map((v) => v.toString()));

	private readonly slotId = computed(() => this.hubContext.slot()?.id ?? null);

	protected readonly filteredSemanas = computed(() => {
		const semanas = this.vm().semanas;
		const query = this.searchQuery().toLowerCase().trim();
		if (!query) return semanas;

		return semanas.filter((s) => {
			if (`Semana ${s.numeroSemana}`.toLowerCase().includes(query)) return true;
			if (s.titulo?.toLowerCase().includes(query)) return true;
			if (s.archivos.some((a) => a.nombreArchivo.toLowerCase().includes(query))) return true;
			if (s.tareas.some((t) => t.titulo.toLowerCase().includes(query))) return true;
			return s.tareas.some((t) => {
				if (!t.fechaLimite) return false;
				return new Date(t.fechaLimite).toLocaleDateString('es-PE').includes(query);
			});
		});
	});
	// #endregion

	constructor() {
		// El shell carga el contenido; acá solo se reinicia la UI local de la franja anterior.
		effect(() => {
			if (this.slotId() === null) return;
			untracked(() => {
				this.searchQuery.set('');
				this.openPanels.set([]);
			});
		});
	}

	// #region Contenido
	protected onRefreshContenido(): void {
		this.facade.refreshContenido();
	}

	protected onAccordionChangeStr(values: string[]): void {
		const openValues = values.map((v) => Number(v));
		const previouslyOpen = this.openPanels();
		this.openPanels.set(openValues);

		// Carga perezosa de "mis archivos" al abrir cada semana.
		const newlyOpened = openValues.filter((v) => !previouslyOpen.includes(v));
		const semanas = this.filteredSemanas();
		for (const semanaId of newlyOpened) {
			const semana = semanas.find((s) => s.id === semanaId);
			if (semana) {
				this.facade.loadMisArchivos(semana.id);
				semana.tareas.forEach((t) => this.facade.loadMisTareaArchivos(t.id));
			}
		}
	}
	// #endregion

	// #region Archivos propios
	protected onFilesSelected(event: EduFileUploadSelectEvent, semanaId: number): void {
		const file = this.pickValidFile(event);
		if (file) this.facade.uploadArchivo(semanaId, file);
	}

	protected onDeleteMiArchivo(semanaId: number, archivo: EstudianteArchivoDto): void {
		this.confirmDelete(archivo.nombreArchivo, () => this.facade.eliminarArchivo(semanaId, archivo.id));
	}
	// #endregion

	// #region Entrega de tareas
	protected onTareaFilesSelected(event: EduFileUploadSelectEvent, tareaId: number): void {
		const file = this.pickValidFile(event);
		if (file) this.facade.uploadTareaArchivo(tareaId, file);
	}

	protected onDeleteMiTareaArchivo(tareaId: number, archivo: EstudianteTareaArchivoDto): void {
		this.confirmDelete(archivo.nombreArchivo, () => this.facade.eliminarTareaArchivo(tareaId, archivo.id));
	}
	// #endregion

	// #region Helpers
	protected getMisArchivosSemana(semanaId: number): EstudianteArchivoDto[] {
		return this.vm().misArchivos[semanaId] ?? [];
	}

	protected getMisTareaArchivos(tareaId: number): EstudianteTareaArchivoDto[] {
		return this.vm().misTareaArchivos[tareaId] ?? [];
	}

	protected openArchivo(archivo: ViewableArchivo): void {
		this.viewer.openArchivo(archivo);
	}

	private confirmDelete(nombreArchivo: string, accept: () => void): void {
		this.confirmationService.confirm({
			message: `¿Eliminar el archivo "${nombreArchivo}"?`,
			header: 'Confirmar Eliminación',
			icon: 'pi pi-exclamation-triangle',
			acceptLabel: 'Eliminar',
			rejectLabel: 'Cancelar',
			acceptButtonStyleClass: 'p-button-danger',
			accept,
		});
	}

	private pickValidFile(event: EduFileUploadSelectEvent): File | null {
		const file = event.files[0] ?? null;
		if (!file) return null;
		const error = validateUploadFile(file);
		if (error) {
			this.errorHandler.showWarning('Archivo no válido', error);
			return null;
		}
		return file;
	}
	// #endregion
}
