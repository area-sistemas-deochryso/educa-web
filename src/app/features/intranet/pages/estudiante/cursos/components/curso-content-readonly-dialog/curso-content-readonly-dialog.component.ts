import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ErrorHandlerService } from '@core/services';
import { FileRowComponent, UPLOAD_ACCEPT, UPLOAD_LIMITS, validateUploadFile } from '@shared/components';
import { EstudianteCursosFacade } from '@features/intranet/pages/estudiante/services/estudiante-cursos.facade';
import { EstudianteArchivoDto, EstudianteTareaArchivoDto } from '@features/intranet/pages/estudiante/models';
// eslint-disable-next-line layer-enforcement/imports-error -- Razón: summary dialogs de archivos/tareas son vistas read-only cross-role (estudiante lee contenido que profesor publica); migración a @intranet-shared diferida (ver maestro F3.5.C).
import { ArchivosSummaryDialogComponent } from '@features/intranet/pages/profesor/cursos/components/archivos-summary-dialog/archivos-summary-dialog.component';
// eslint-disable-next-line layer-enforcement/imports-error -- Razón: ver import anterior — mismo dialog cross-role.
import { TareasSummaryDialogComponent } from '@features/intranet/pages/profesor/cursos/components/tareas-summary-dialog/tareas-summary-dialog.component';
import { NotasCursoCardComponent } from '@features/intranet/pages/estudiante/notas/components/notas-curso-card/notas-curso-card.component';
import { EduAccordion, EduAccordionHeader, EduAccordionPanel, EduButton, EduConfirmDialog, EduConfirmationService, EduDialog, EduFileUpload, type EduFileUploadSelectEvent, EduTab, EduTabPanel, EduTabs, EduTooltip } from '@edu-ui';

@Component({
	selector: 'app-curso-content-readonly-dialog',
	standalone: true,
	imports: [DatePipe, 
		FormsModule,
		EduDialog,
		EduAccordion, EduAccordionHeader, EduAccordionPanel,
		EduButton,
		EduTooltip,
		EduConfirmDialog,
		EduTabs, EduTab, EduTabPanel,
		EduFileUpload,
		FileRowComponent,
		ArchivosSummaryDialogComponent,
		TareasSummaryDialogComponent,
		NotasCursoCardComponent],
	providers: [EduConfirmationService],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './curso-content-readonly-dialog.component.html',
	styleUrl: './curso-content-readonly-dialog.component.scss',
})
export class CursoContentReadonlyDialogComponent {
	// #region Dependencias
	private readonly facade = inject(EstudianteCursosFacade);
	private readonly confirmationService = inject(EduConfirmationService);
	private readonly router = inject(Router);
	private readonly errorHandler = inject(ErrorHandlerService);
	readonly uploadAccept = UPLOAD_ACCEPT;
	readonly uploadMaxBytes = UPLOAD_LIMITS.maxFileSizeBytes;
	// #endregion

	// #region Estado del facade
	readonly vm = this.facade.vm;
	// #endregion

	// #region Estado local
	readonly searchQuery = signal('');
	readonly isFullscreen = signal(false);
	readonly activeTab = signal('0');
	readonly openPanels = signal<number[]>([]);
	private notasLoaded = false;
	// #endregion

	// #region Computed
	// edu-accordion's [value] is string-based (no numeric convention) — semana ids are
	// numeric, so this bridges the two at the template boundary only.
	readonly openPanelsStr = computed(() => this.openPanels().map((v) => v.toString()));

	readonly dialogStyle = computed((): Record<string, string> => {
		if (this.isFullscreen()) return { width: '100vw', maxWidth: '100vw', height: '100vh', maxHeight: '100vh' };
		return { width: '960px', maxWidth: '95vw' };
	});
	readonly contentStyle = computed((): Record<string, string> => {
		if (this.isFullscreen()) return { 'overflow-y': 'auto' };
		return { 'max-height': '80vh', 'overflow-y': 'auto' };
	});
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

	// #region Dialog handlers
	toggleFullscreen(): void {
		this.isFullscreen.update((v) => !v);
	}

	onVisibleChange(visible: boolean): void {
		if (!visible) {
			this.facade.closeContentDialog();
			this.searchQuery.set('');
			this.isFullscreen.set(false);
			this.activeTab.set('0');
			this.openPanels.set([]);
			this.notasLoaded = false;
		}
	}

	onVerAsistencia(): void {
		const contenido = this.vm().contenido;
		if (!contenido) return;
		this.facade.closeContentDialog();
		this.router.navigate(['/intranet/estudiante/asistencia'], {
			queryParams: { horarioId: contenido.horarioId },
		});
	}

	onVerSalon(): void {
		const contenido = this.vm().contenido;
		if (!contenido) return;
		this.facade.closeContentDialog();
		this.router.navigate(['/intranet/estudiante/salones'], {
			queryParams: { horarioId: contenido.horarioId },
		});
	}

	onTabChange(value: string): void {
		this.activeTab.set(value);
		if (value === '1' && !this.notasLoaded) {
			this.notasLoaded = true;
			this.facade.loadMisNotasCurso();
		}
	}
	// #endregion

	// #region Refresh handlers
	onRefreshContenido(): void {
		this.facade.refreshContenido();
	}

	onRefreshNotas(): void {
		this.facade.refreshMisNotasCurso();
	}
	// #endregion

	// #region Accordion handlers
	onAccordionChangeStr(values: string[]): void {
		this.onAccordionChange(values.map((v) => Number(v)));
	}

	onAccordionChange(openValues: number[]): void {
		const previouslyOpen = this.openPanels();
		this.openPanels.set(openValues);

		// Detect newly opened panels to lazy-load data
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

	// #region Student file actions
	onFilesSelected(event: EduFileUploadSelectEvent, semanaId: number): void {
		const file = this.pickValidFile(event);
		if (file) {
			this.facade.uploadArchivo(semanaId, file);
		}
	}

	onDeleteMiArchivo(semanaId: number, archivo: EstudianteArchivoDto): void {
		this.confirmationService.confirm({
			message: `¿Eliminar el archivo "${archivo.nombreArchivo}"?`,
			header: 'Confirmar Eliminación',
			icon: 'pi pi-exclamation-triangle',
			acceptLabel: 'Eliminar',
			rejectLabel: 'Cancelar',
			acceptButtonStyleClass: 'p-button-danger',
			accept: () => {
				this.facade.eliminarArchivo(semanaId, archivo.id);
			},
		});
	}
	// #endregion

	// #region Student task file actions
	onTareaFilesSelected(event: EduFileUploadSelectEvent, tareaId: number): void {
		const file = this.pickValidFile(event);
		if (file) {
			this.facade.uploadTareaArchivo(tareaId, file);
		}
	}

	onDeleteMiTareaArchivo(tareaId: number, archivo: EstudianteTareaArchivoDto): void {
		this.confirmationService.confirm({
			message: `¿Eliminar el archivo "${archivo.nombreArchivo}"?`,
			header: 'Confirmar Eliminación',
			icon: 'pi pi-exclamation-triangle',
			acceptLabel: 'Eliminar',
			rejectLabel: 'Cancelar',
			acceptButtonStyleClass: 'p-button-danger',
			accept: () => {
				this.facade.eliminarTareaArchivo(tareaId, archivo.id);
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
	// #endregion

	// #region Helpers
	getMisArchivosSemana(semanaId: number): EstudianteArchivoDto[] {
		return this.vm().misArchivos[semanaId] ?? [];
	}

	getMisTareaArchivos(tareaId: number): EstudianteTareaArchivoDto[] {
		return this.vm().misTareaArchivos[tareaId] ?? [];
	}

	openArchivo(url: string): void {
		window.open(url, '_blank');
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
