import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { AccordionModule } from 'primeng/accordion';
import { TooltipModule } from 'primeng/tooltip';

import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { CursoContenidoFacade } from '../../services/curso-contenido.facade';
import { CursoContenidoSemanaDto, CursoContenidoTareaDto, ActualizarTareaRequest, CrearTareaRequest } from '../../../models';
import { SemanaEditDialogComponent } from '../semana-edit-dialog/semana-edit-dialog.component';
import { TareaDialogComponent } from '../tarea-dialog/tarea-dialog.component';
import { ArchivosSummaryDialogComponent } from '../archivos-summary-dialog/archivos-summary-dialog.component';
import { TareasSummaryDialogComponent } from '../tareas-summary-dialog/tareas-summary-dialog.component';
import { StudentFilesDialogComponent } from '../student-files-dialog/student-files-dialog.component';

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
		ConfirmDialogModule,
		SemanaEditDialogComponent,
		TareaDialogComponent,
		ArchivosSummaryDialogComponent,
		TareasSummaryDialogComponent,
		StudentFilesDialogComponent,
	],
	providers: [ConfirmationService],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './curso-content-dialog.component.html',
	styleUrl: './curso-content-dialog.component.scss',
})
export class CursoContentDialogComponent {
	private readonly facade = inject(CursoContenidoFacade);
	private readonly confirmationService = inject(ConfirmationService);

	readonly vm = this.facade.vm;

	// #region Estado local
	readonly searchQuery = signal('');
	private activeSemanaId = signal<number | null>(null);

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
	onVisibleChange(visible: boolean): void {
		if (!visible) {
			this.facade.closeContentDialog();
			this.searchQuery.set('');
		}
	}

	// #endregion
	// #region Semana actions
	onEditSemana(semana: CursoContenidoSemanaDto): void {
		this.facade.openSemanaEditDialog(semana);
	}

	onSemanaEditVisibleChange(visible: boolean): void {
		if (!visible) {
			this.facade.closeSemanaEditDialog();
		}
	}

	onSaveSemana(request: { titulo: string | null; descripcion: string | null; mensajeDocente: string | null }): void {
		const semana = this.vm().selectedSemana;
		if (semana) {
			this.facade.actualizarSemana(semana.id, request);
		}
	}

	// #endregion
	// #region Archivo actions
	onNativeFileSelect(event: Event, semanaId: number): void {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) {
			this.activeSemanaId.set(semanaId);
			this.facade.uploadArchivo(semanaId, file);
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
				this.facade.eliminarArchivo(semanaId, archivoId);
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
			this.facade.uploadTareaArchivo(semanaId, tareaId, file);
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
				this.facade.eliminarTareaArchivo(semanaId, tareaId, archivoId);
			},
		});
	}

	// #endregion
	// #region Tarea actions
	onAddTarea(): void {
		this.facade.openTareaDialog(null);
	}

	onEditTarea(tarea: CursoContenidoTareaDto): void {
		this.facade.openTareaDialog(tarea);
	}

	onTareaVisibleChange(visible: boolean): void {
		if (!visible) {
			this.facade.closeTareaDialog();
		}
	}

	onCreateTarea(request: CrearTareaRequest): void {
		const semana = this.getActiveSemanaForTarea();
		if (semana) {
			this.facade.crearTarea(semana.id, request);
		}
	}

	onUpdateTarea(request: ActualizarTareaRequest): void {
		const semana = this.getActiveSemanaForTarea();
		const tarea = this.vm().selectedTarea;
		if (semana && tarea) {
			this.facade.actualizarTarea(semana.id, tarea.id, request);
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
				this.facade.eliminarTarea(semanaId, tareaId);
			},
		});
	}

	// #endregion
	// #region Sub-modal handlers
	onOpenArchivosSummary(): void {
		this.facade.openArchivosSummaryDialog();
	}

	onArchivosSummaryVisibleChange(visible: boolean): void {
		if (!visible) {
			this.facade.closeArchivosSummaryDialog();
		}
	}

	onOpenTareasSummary(): void {
		this.facade.openTareasSummaryDialog();
	}

	onTareasSummaryVisibleChange(visible: boolean): void {
		if (!visible) {
			this.facade.closeTareasSummaryDialog();
		}
	}

	onOpenStudentFiles(): void {
		const contenido = this.vm().contenido;
		if (contenido) {
			this.facade.openStudentFilesDialog(contenido.id);
		}
	}

	onStudentFilesVisibleChange(visible: boolean): void {
		if (!visible) {
			this.facade.closeStudentFilesDialog();
		}
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
				this.facade.eliminarContenido(contenido.id);
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
