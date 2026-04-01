import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { AccordionModule } from 'primeng/accordion';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService } from 'primeng/api';
import { CursoContenidoDataFacade } from '../../services/curso-contenido-data.facade';
import { CursoContenidoCrudFacade } from '../../services/curso-contenido-crud.facade';
import { CursoContenidoUiFacade } from '../../services/curso-contenido-ui.facade';
import { CursoContenidoSemanaDto, CursoContenidoTareaDto } from '../../../models';
import { FormatFileSizePipe } from '@shared/pipes';

@Component({
	selector: 'app-semanas-accordion',
	standalone: true,
	imports: [CommonModule, FormsModule, ButtonModule, AccordionModule, TooltipModule, FormatFileSizePipe],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './semanas-accordion.component.html',
	styleUrl: './semanas-accordion.component.scss',
})
export class SemanasAccordionComponent {
	// #region Dependencias
	private readonly dataFacade = inject(CursoContenidoDataFacade);
	private readonly crudFacade = inject(CursoContenidoCrudFacade);
	private readonly uiFacade = inject(CursoContenidoUiFacade);
	private readonly confirmationService = inject(ConfirmationService);
	// #endregion

	// #region Estado del facade
	readonly vm = this.uiFacade.vm;
	// #endregion

	// #region Estado local
	readonly searchQuery = signal('');
	readonly openPanels = signal<number[]>([]);
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
	onNativeFileSelect(event: Event, semanaId: number): void {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) {
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
	// #endregion
}
