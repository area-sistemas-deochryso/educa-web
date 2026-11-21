import { Component, ChangeDetectionStrategy, ElementRef, effect, inject, signal, computed, untracked, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CursoContenidoDataFacade } from '../../services/curso-contenido-data.facade';
import { CursoContenidoCrudFacade } from '../../services/curso-contenido-crud.facade';
import { CursoContenidoPublicacionFacade } from '../../services/curso-contenido-publicacion.facade';
import { CursoContenidoUiFacade } from '../../services/curso-contenido-ui.facade';
import { ContenidoArchivoTipo, CursoContenidoArchivoDto, CursoContenidoSemanaDto, CursoContenidoTareaDto, TareaArchivoDto } from '@features/intranet/pages/profesor/models';
import { ErrorHandlerService, StorageService, type ContenidoSemanasLayout } from '@core/services';
import { buildResumenes, type FechaLimiteEstado, type SemanaFiltro } from './semanas-accordion.helpers';
import { SemanaNavComponent, resolverSemanaActiva, type SemanaNavItem } from '@intranet-shared/components';
import { FileRowComponent, UPLOAD_ACCEPT, UPLOAD_LIMITS, describeUploadLimits, validateUploadFile, FileViewerService, ViewableArchivo } from '@shared/components';
import { EduButton, EduConfirmationService, EduFileUpload, type EduFileUploadSelectEvent, EduMenu, type EduMenuItem, EduMessageService, EduToast, EduTooltip } from '@edu-ui';

export type { SemanaFiltro, SemanaEstado, FechaLimiteEstado } from './semanas-accordion.helpers';
const DIAS_URGENTE = 2;
const MS_POR_DIA = 86_400_000;
@Component({
	selector: 'app-semanas-accordion',
	standalone: true,
	imports: [DatePipe, FormsModule, EduButton, SemanaNavComponent, EduTooltip, EduToast, EduFileUpload, EduMenu, FileRowComponent],
	providers: [EduMessageService],
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
	private readonly messageService = inject(EduMessageService);
	private readonly storage = inject(StorageService);
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
	/** Vista de semanas elegida por el usuario (se recuerda entre visitas). */
	readonly layout = signal<ContenidoSemanasLayout>(this.storage.getContenidoSemanasLayout());
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
	readonly resumenes = computed(() => buildResumenes(this.semanasVista(), this.numeroVigente()));

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
		// Sin selección previa, se abre la semana vigente (o la primera si el BE no la pudo derivar).
		effect(() => {
			const semanaId = this.semanaVigenteId() ?? this.vm().semanas[0]?.id ?? null;
			if (semanaId === null) return;
			untracked(() => {
				if (this.openPanels().length > 0) return;
				this.openPanels.set([semanaId]);
			});
		});
	}
	// #endregion

	// #region Navegación de semanas
	/** Semana mostrada: la seleccionada si sigue visible; si no, la primera de la lista. */
	readonly semanaActiva = computed(() => resolverSemanaActiva(this.semanasVista(), this.openPanels()));

	readonly navItems = computed<SemanaNavItem[]>(() => {
		const resumenes = this.resumenes();
		return this.semanasVista().map((s) => {
			const r = resumenes.get(s.id);
			return {
				id: s.id,
				numero: s.numeroSemana,
				titulo: s.titulo ?? null,
				fechaInicio: s.fechaInicio ?? null,
				fechaFin: s.fechaFin ?? null,
				estado: r?.estado ?? 'proxima',
				archivos: s.archivos.length,
				tareas: (r?.individuales ?? 0) + (r?.grupales ?? 0),
				examenes: r?.examenes ?? 0,
				proximaFecha: r?.proximaFecha ?? null,
				borrador: s.publicado === false,
			};
		});
	});

	selectSemana(semanaId: number): void {
		this.openPanels.set([semanaId]);
	}

	setLayout(layout: ContenidoSemanasLayout): void {
		this.layout.set(layout);
		this.storage.setContenidoSemanasLayout(layout);
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
		const publicado = semana.publicado === false;
		this.publicacionFacade.cambiarPublicacionSemana(semana.id, publicado, () =>
			this.avisarPublicacion(`Semana ${semana.numeroSemana}`, publicado, 'a', () => this.publicacionFacade.cambiarPublicacionSemana(semana.id, !publicado)),
		);
	}

	togglePublicacionArchivo(semanaId: number, archivo: CursoContenidoArchivoDto): void {
		const publicado = archivo.publicado === false;
		this.publicacionFacade.cambiarPublicacionArchivo(semanaId, archivo.id, publicado, () =>
			this.avisarPublicacion(archivo.nombreArchivo, publicado, 'o', () => this.publicacionFacade.cambiarPublicacionArchivo(semanaId, archivo.id, !publicado)),
		);
	}

	togglePublicacionTareaArchivo(semanaId: number, tareaId: number, archivo: TareaArchivoDto): void {
		const publicado = archivo.publicado === false;
		this.publicacionFacade.cambiarPublicacionTareaArchivo(semanaId, tareaId, archivo.id, publicado, () =>
			this.avisarPublicacion(archivo.nombreArchivo, publicado, 'o', () => this.publicacionFacade.cambiarPublicacionTareaArchivo(semanaId, tareaId, archivo.id, !publicado)),
		);
	}

	togglePublicacionTarea(semanaId: number, tarea: CursoContenidoTareaDto): void {
		const publicado = tarea.publicado === false;
		this.publicacionFacade.cambiarPublicacionTarea(semanaId, tarea.id, publicado, () =>
			this.avisarPublicacion(tarea.titulo, publicado, 'a', () => this.publicacionFacade.cambiarPublicacionTarea(semanaId, tarea.id, !publicado)),
		);
	}

	/** Confirma el efecto concreto sobre lo que ven los estudiantes y ofrece deshacer (el deshacer no vuelve a avisar). */
	private avisarPublicacion(nombre: string, publicado: boolean, genero: 'a' | 'o', deshacer: () => void): void {
		const pronombre = genero === 'a' ? 'la' : 'lo';
		this.messageService.add({
			key: 'publicacion',
			severity: 'success',
			summary: publicado ? `${nombre} publicad${genero}` : `${nombre} en borrador`,
			detail: publicado ? `Los estudiantes ya ${pronombre} ven.` : `Los estudiantes ya no ${pronombre} ven.`,
			life: 6000,
			data: { deshacer },
		});
	}

	deshacerPublicacion(message: { id: number; data?: unknown }): void {
		(message.data as { deshacer: () => void }).deshacer();
		this.messageService.remove(message.id);
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
