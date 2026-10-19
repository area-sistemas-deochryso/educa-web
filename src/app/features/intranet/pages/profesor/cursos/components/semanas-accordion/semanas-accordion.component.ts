import { Component, ChangeDetectionStrategy, ElementRef, effect, inject, signal, computed, untracked, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CursoContenidoDataFacade } from '../../services/curso-contenido-data.facade';
import { CursoContenidoCrudFacade } from '../../services/curso-contenido-crud.facade';
import { CursoContenidoPublicacionFacade } from '../../services/curso-contenido-publicacion.facade';
import { CursoContenidoUiFacade } from '../../services/curso-contenido-ui.facade';
import { ContenidoArchivoTipo, CursoContenidoArchivoDto, CursoContenidoSemanaDto, CursoContenidoTareaDto, TareaArchivoDto } from '@features/intranet/pages/profesor/models';
import { ErrorHandlerService } from '@core/services';
import { FileRowComponent, UPLOAD_ACCEPT, UPLOAD_LIMITS, describeUploadLimits, validateUploadFile, FileViewerService, ViewableArchivo } from '@shared/components';
import { EduAccordion, EduAccordionHeader, EduAccordionPanel, EduButton, EduConfirmationService, EduFileUpload, type EduFileUploadSelectEvent, EduMenu, type EduMenuItem, EduTooltip } from '@edu-ui';

// #region Tipos de la vista
export type SemanaFiltro = 'all' | 'study' | 'deliver';
export type SemanaEstado = 'actual' | 'pasada' | 'proxima';
export type FechaLimiteEstado = 'vencida' | 'pronto' | 'normal';

interface SemanaResumen {
	individuales: number;
	grupales: number;
	examenes: number;
	/** Próxima fecha límite aún no vencida (ISO) o `null`. */
	proximaFecha: string | null;
	estado: SemanaEstado;
}

const DIAS_URGENTE = 2;
const MS_POR_DIA = 86_400_000;
// #endregion
@Component({
	selector: 'app-semanas-accordion',
	standalone: true,
	imports: [DatePipe, FormsModule, EduButton, EduAccordion, EduAccordionHeader, EduAccordionPanel, EduTooltip, EduFileUpload, EduMenu, FileRowComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './semanas-accordion.component.html',
	styleUrl: './semanas-accordion.component.scss',
})
export class SemanasAccordionComponent {
	private readonly viewer = inject(FileViewerService);
	// #region Dependencias
	private readonly dataFacade = inject(CursoContenidoDataFacade);
	private readonly crudFacade = inject(CursoContenidoCrudFacade);
	private readonly publicacionFacade = inject(CursoContenidoPublicacionFacade);
	private readonly uiFacade = inject(CursoContenidoUiFacade);
	private readonly confirmationService = inject(EduConfirmationService);
	private readonly errorHandler = inject(ErrorHandlerService);
	private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
	readonly uploadAccept = UPLOAD_ACCEPT;
	readonly uploadMaxBytes = UPLOAD_LIMITS.maxFileSizeBytes;
	readonly uploadHint = describeUploadLimits();
	// #endregion

	// #region Estado del facade
	readonly vm = this.uiFacade.vm;
	// #endregion

	// #region Estado local
	readonly searchQuery = signal('');
	readonly openPanels = signal<number[]>([]);
	/** Vista previa de lo que ve el estudiante: oculta todos los controles de edición. */
	readonly studentView = signal(false);
	readonly filtro = signal<SemanaFiltro>('all');
	private readonly addMenuRef = viewChild<EduMenu>('addMenu');
	private readonly fileInputRef = viewChild<ElementRef<HTMLInputElement>>('materialInput');
	private menuSemanaId: number | null = null;
	private materialTipo: ContenidoArchivoTipo = 'CLASE';
	// #endregion

	// #region Menú "Agregar"
	readonly addMenuItems: EduMenuItem[] = [
		{ label: 'Material de clase', icon: 'pi pi-desktop', command: () => this.pickMaterial('CLASE') },
		{ label: 'Material complementario', icon: 'pi pi-paperclip', command: () => this.pickMaterial('COMPLEMENTARIO') },
		{ label: 'Tarea', icon: 'pi pi-file-edit', command: () => this.uiFacade.openTareaDialog(null, 'TAREA') },
		{ label: 'Actividad', icon: 'pi pi-pencil', command: () => this.uiFacade.openTareaDialog(null, 'ACTIVIDAD') },
		{ label: 'Examen', icon: 'pi pi-verified', command: () => this.uiFacade.openTareaDialog(null, 'EXAMEN') },
	];

	private pickMaterial(tipo: ContenidoArchivoTipo): void {
		this.materialTipo = tipo;
		this.fileInputRef()?.nativeElement.click();
	}

	openAddMenu(event: Event, semana: CursoContenidoSemanaDto): void {
		this.menuSemanaId = semana.id;
		this.uiFacade.setActiveSemanaId(semana.id);
		this.addMenuRef()?.toggle(event);
	}

	onSubirMaterial(semana: CursoContenidoSemanaDto): void {
		this.menuSemanaId = semana.id;
		this.uiFacade.setActiveSemanaId(semana.id);
		this.pickMaterial('CLASE');
	}

	onMaterialSelected(event: Event): void {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0] ?? null;
		input.value = '';
		if (!file || this.menuSemanaId === null) return;
		const error = validateUploadFile(file);
		if (error) {
			this.errorHandler.showWarning('Archivo no válido', error);
			return;
		}
		this.crudFacade.uploadArchivo(this.menuSemanaId, file, this.materialTipo);
	}
	// #endregion

	// #region Resumen por semana
	private readonly numeroVigente = computed(() => this.vm().contenido?.semanaVigente ?? null);

	/**
	 * Semanas tal como se muestran. En vista estudiante se descartan borradores (semanas, archivos y tareas),
	 * igual que hace el backend con un estudiante real.
	 */
	readonly semanasVista = computed(() => {
		const semanas = this.filteredSemanas();
		if (!this.studentView()) return semanas;
		return semanas
			.filter((s) => s.publicado !== false)
			.map((s) => ({
				...s,
				archivos: s.archivos.filter((a) => a.publicado !== false),
				tareas: s.tareas
					.filter((t) => t.publicado !== false)
					.map((t) => ({ ...t, archivos: t.archivos.filter((a) => a.publicado !== false) })),
			}));
	});

	/** Contadores, próxima fecha y estado de cada semana, calculados una vez por cambio de datos. */
	readonly resumenes = computed(() => {
		const vigente = this.numeroVigente();
		const ahora = Date.now();
		const map = new Map<number, SemanaResumen>();
		for (const s of this.semanasVista()) {
			const examenes = s.tareas.filter((t) => t.tipo === 'EXAMEN').length;
			const trabajos = s.tareas.filter((t) => t.tipo !== 'EXAMEN');
			const grupales = trabajos.filter((t) => t.esGrupal).length;
			const proxima = s.tareas
				.map((t) => t.fechaLimite)
				.filter((f): f is string => !!f && new Date(f).getTime() >= ahora)
				.sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0] ?? null;
			const estado: SemanaEstado = vigente === null ? 'proxima' : s.numeroSemana === vigente ? 'actual' : s.numeroSemana < vigente ? 'pasada' : 'proxima';
			map.set(s.id, { individuales: trabajos.length - grupales, grupales, examenes, proximaFecha: proxima, estado });
		}
		return map;
	});

	fechaLimiteEstado(fecha: string | null): FechaLimiteEstado {
		if (!fecha) return 'normal';
		const diff = new Date(fecha).getTime() - Date.now();
		if (diff < 0) return 'vencida';
		return diff <= DIAS_URGENTE * MS_POR_DIA ? 'pronto' : 'normal';
	}
	// #endregion

	// #region Semana vigente (P110-F14)
	/** Id de la semana vigente; `null` si el BE no pudo derivarla o no existe esa semana. */
	readonly semanaVigenteId = computed(() => {
		const vigente = this.vm().contenido?.semanaVigente;
		if (!vigente) return null;
		return this.vm().semanas.find((s) => s.numeroSemana === vigente)?.id ?? null;
	});

	constructor() {
		// La semana vigente se expande sola y la vista se lleva hasta ella; el resto queda colapsado.
		effect(() => {
			const semanaId = this.semanaVigenteId();
			if (semanaId === null) return;
			untracked(() => {
				if (this.openPanels().includes(semanaId)) return;
				this.openPanels.update((prev) => [...prev, semanaId]);
				setTimeout(() => {
					this.host.nativeElement
						.querySelector('[data-semana-vigente="true"]')
						?.scrollIntoView({ block: 'start', behavior: 'smooth' });
				});
			});
		});
	}
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

	// #region Publicación (borrador / publicado)
	togglePublicacionSemana(semana: CursoContenidoSemanaDto): void {
		this.publicacionFacade.cambiarPublicacionSemana(semana.id, semana.publicado === false);
	}

	togglePublicacionArchivo(semanaId: number, archivo: CursoContenidoArchivoDto): void {
		this.publicacionFacade.cambiarPublicacionArchivo(semanaId, archivo.id, archivo.publicado === false);
	}

	togglePublicacionTareaArchivo(semanaId: number, tareaId: number, archivo: TareaArchivoDto): void {
		this.publicacionFacade.cambiarPublicacionTareaArchivo(semanaId, tareaId, archivo.id, archivo.publicado === false);
	}

	togglePublicacionTarea(semanaId: number, tarea: CursoContenidoTareaDto): void {
		this.publicacionFacade.cambiarPublicacionTarea(semanaId, tarea.id, tarea.publicado === false);
	}
	// #endregion

	// #region Presentación de tareas
	/** Etiqueta del tipo: "Examen", "Actividad grupal", "Tarea individual", etc. */
	tareaEtiqueta(tarea: CursoContenidoTareaDto): string {
		if (tarea.tipo === 'EXAMEN') return 'Examen';
		const base = tarea.tipo === 'ACTIVIDAD' ? 'Actividad' : 'Tarea';
		return `${base} ${tarea.esGrupal ? 'grupal' : 'individual'}`;
	}

	/** Porcentaje de entregas (0-100) para la barra; `null` si el backend no envió el conteo. */
	entregasPorcentaje(tarea: CursoContenidoTareaDto): number | null {
		const esperadas = tarea.entregasEsperadas;
		if (!esperadas || tarea.entregasRecibidas == null) return null;
		return Math.min(100, Math.round((tarea.entregasRecibidas / esperadas) * 100));
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

	openArchivo(archivo: ViewableArchivo): void {
		this.viewer.openArchivo(archivo);
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
