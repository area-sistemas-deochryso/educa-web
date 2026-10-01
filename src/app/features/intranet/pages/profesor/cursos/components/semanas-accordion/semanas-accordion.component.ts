import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CursoContenidoDataFacade } from '../../services/curso-contenido-data.facade';
import { CursoContenidoCrudFacade } from '../../services/curso-contenido-crud.facade';
import { CursoContenidoUiFacade } from '../../services/curso-contenido-ui.facade';
import { CursoContenidoSemanaDto, CursoContenidoTareaDto } from '@features/intranet/pages/profesor/models';
import { ErrorHandlerService } from '@core/services';
import { FileRowComponent, UPLOAD_ACCEPT, UPLOAD_LIMITS, validateUploadFile } from '@shared/components';
import { EduAccordion, EduAccordionHeader, EduAccordionPanel, EduButton, EduConfirmationService, EduFileUpload, type EduFileUploadSelectEvent, EduTooltip } from '@edu-ui';
@Component({
	selector: 'app-semanas-accordion',
	standalone: true,
	imports: [DatePipe, FormsModule, EduButton, EduAccordion, EduAccordionHeader, EduAccordionPanel, EduTooltip, EduFileUpload, FileRowComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './semanas-accordion.component.html',
	styleUrl: './semanas-accordion.component.scss',
})
export class SemanasAccordionComponent {
	// #region Dependencias
	private readonly dataFacade = inject(CursoContenidoDataFacade);
	private readonly crudFacade = inject(CursoContenidoCrudFacade);
	private readonly uiFacade = inject(CursoContenidoUiFacade);
	private readonly confirmationService = inject(EduConfirmationService);
	private readonly errorHandler = inject(ErrorHandlerService);
	readonly uploadAccept = UPLOAD_ACCEPT;
	readonly uploadMaxBytes = UPLOAD_LIMITS.maxFileSizeBytes;
	// #endregion

	// #region Estado del facade
	readonly vm = this.uiFacade.vm;
	// #endregion

	// #region Estado local
	readonly searchQuery = signal('');
	readonly openPanels = signal<number[]>([]);
	// #endregion

	// #region Accordion value bridge
	// edu-accordion's [value] is string-based (no numeric convention) — semana ids are
	// numeric, so this bridges the two at the template boundary only.
	readonly openPanelsStr = computed(() => this.openPanels().map((v) => v.toString()));

	onOpenPanelsChangeStr(values: string[]): void {
		this.openPanels.set(values.map((v) => Number(v)));
	}
	// #endregion

	// #region Computed
	readonly filteredSemanas = computed(() => {
		const semanas = this.vm().semanas;
		const query = this.searchQuery().toLowerCase().trim();
		if (!query) return semanas;

		return semanas.filter((s) => {
			if (`Semana ${s.numeroSemana}`.toLowerCase().includes(query)) return true;
			if (s.titulo?.toLowerCase().includes(query)) return true;
			if (s.archivos.some((a) => a.nombreArchivo.toLowerCase().includes(query))) return true;
			if (s.tareas.some((t) => t.titulo.toLowerCase().includes(query))) return true;
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

	// #region Refresh
	onRefreshContenido(): void {
		this.dataFacade.refreshContenido();
	}
	// #endregion

	// #region Semana actions
	onEditSemana(semana: CursoContenidoSemanaDto): void {
		this.uiFacade.openSemanaEditDialog(semana);
	}
	// #endregion

	// #region Archivo actions
	onFilesSelected(event: EduFileUploadSelectEvent, semanaId: number): void {
		const file = this.pickValidFile(event);
		if (file) {
			this.crudFacade.uploadArchivo(semanaId, file);
		}
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
	onTareaFilesSelected(event: EduFileUploadSelectEvent, semanaId: number, tareaId: number): void {
		const file = this.pickValidFile(event);
		if (file) {
			this.crudFacade.uploadTareaArchivo(semanaId, tareaId, file);
		}
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

	onViewTaskSubmissions(tarea: CursoContenidoTareaDto): void {
		this.uiFacade.openTaskSubmissionsDialog(tarea);
	}

	setActiveSemanaForTarea(semana: CursoContenidoSemanaDto): void {
		this.uiFacade.setActiveSemanaId(semana.id);
	}
	// #endregion

	// #region Helpers
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
