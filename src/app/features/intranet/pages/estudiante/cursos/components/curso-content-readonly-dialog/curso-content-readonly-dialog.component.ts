import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { AccordionModule } from 'primeng/accordion';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TabsModule } from 'primeng/tabs';
import { ConfirmationService } from 'primeng/api';
import { FormatFileSizePipe } from '@shared/pipes';
import { EstudianteCursosFacade } from '../../../services/estudiante-cursos.facade';
import { CursoContenidoSemanaDto, EstudianteArchivoDto, EstudianteTareaArchivoDto } from '../../../models';
import { ArchivosSummaryDialogComponent } from '../../../../profesor/cursos/components/archivos-summary-dialog/archivos-summary-dialog.component';
import { TareasSummaryDialogComponent } from '../../../../profesor/cursos/components/tareas-summary-dialog/tareas-summary-dialog.component';
import { NotasCursoCardComponent } from '../../../notas/components/notas-curso-card/notas-curso-card.component';

@Component({
	selector: 'app-curso-content-readonly-dialog',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		DialogModule,
		AccordionModule,
		ButtonModule,
		TooltipModule,
		ConfirmDialogModule,
		TabsModule,
		FormatFileSizePipe,
		ArchivosSummaryDialogComponent,
		TareasSummaryDialogComponent,
		NotasCursoCardComponent,
	],
	providers: [ConfirmationService],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './curso-content-readonly-dialog.component.html',
	styleUrl: './curso-content-readonly-dialog.component.scss',
})
export class CursoContentReadonlyDialogComponent {
	// #region Dependencias
	private readonly facade = inject(EstudianteCursosFacade);
	private readonly confirmationService = inject(ConfirmationService);
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
	readonly dialogStyle = computed(() =>
		this.isFullscreen()
			? { width: '100vw', maxWidth: '100vw', height: '100vh', maxHeight: '100vh' }
			: { width: '960px', maxWidth: '95vw' },
	);
	readonly contentStyle = computed(() =>
		this.isFullscreen() ? { 'overflow-y': 'auto' } : { 'max-height': '80vh', 'overflow-y': 'auto' },
	);
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
	onNativeFileSelect(event: Event, semanaId: number): void {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) {
			this.facade.uploadArchivo(semanaId, file);
		}
		input.value = '';
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
	onNativeTareaFileSelect(event: Event, tareaId: number): void {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) {
			this.facade.uploadTareaArchivo(tareaId, file);
		}
		input.value = '';
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
