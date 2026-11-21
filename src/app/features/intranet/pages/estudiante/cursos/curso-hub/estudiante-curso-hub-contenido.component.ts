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
import { ErrorHandlerService, StorageService, type ContenidoSemanasLayout } from '@core/services';
import { FileRowComponent, UPLOAD_ACCEPT, UPLOAD_LIMITS, describeUploadLimits, validateUploadFile, FileViewerService, ViewableArchivo } from '@shared/components';
import { CursoHubContextService, EmptyStateComponent, SemanaNavComponent, resolverSemanaActiva, type SemanaNavItem } from '@intranet-shared/components';
import { TareasPendientesService } from '@intranet-shared/services';
import { EstudianteCursosFacade } from '@features/intranet/pages/estudiante/services/estudiante-cursos.facade';
import type { EstudianteArchivoDto, EstudianteTareaArchivoDto } from '@features/intranet/pages/estudiante/models';
import {
	EduButton,
	EduConfirmDialog,
	EduConfirmationService,
	EduFileUpload,
	type EduFileUploadSelectEvent,
	EduSpinner,
	EduTooltip,
} from '@edu-ui';

import { contarExamenes, fechaLimiteEstado, proximaFechaLimite, tareaEtiqueta } from './contenido-tarea.helpers';

type TareaEstadoKind = 'entregada' | 'borrador' | 'pendiente' | 'vencida';

interface TareaEstado {
	kind: TareaEstadoKind;
	label: string;
	icon: string;
}

const TAREA_ESTADO: Record<TareaEstadoKind, TareaEstado> = {
	entregada: { kind: 'entregada', label: 'Entregada', icon: 'pi pi-check-circle' },
	borrador: { kind: 'borrador', label: 'Borrador sin publicar', icon: 'pi pi-eye-slash' },
	pendiente: { kind: 'pendiente', label: 'Pendiente de entrega', icon: 'pi pi-clock' },
	vencida: { kind: 'vencida', label: 'Vencida sin entrega', icon: 'pi pi-exclamation-circle' },
};

/** Fecha local de hoy como `YYYY-MM-DD`, comparable con el prefijo de `fechaLimite`. */
function todayIso(): string {
	return new Date().toLocaleDateString('en-CA');
}

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
		EduButton,
		EduConfirmDialog,
		EduFileUpload,
		EduSpinner,
		EduTooltip,
		EmptyStateComponent,
		FileRowComponent,
		SemanaNavComponent,
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
	private readonly tareasPendientes = inject(TareasPendientesService);
	private readonly storage = inject(StorageService);
	protected readonly uploadAccept = UPLOAD_ACCEPT;
	protected readonly uploadMaxBytes = UPLOAD_LIMITS.maxFileSizeBytes;
	protected readonly uploadHint = describeUploadLimits();
	// Presentación de tareas (funciones puras, ver contenido-tarea.helpers.ts)
	protected readonly tareaEtiqueta = tareaEtiqueta;
	protected readonly fechaLimiteEstado = fechaLimiteEstado;
	protected readonly proximaFechaLimite = proximaFechaLimite;
	protected readonly contarExamenes = contarExamenes;
	// #endregion

	// #region Estado
	protected readonly vm = this.facade.vm;
	protected readonly searchQuery = signal('');
	protected readonly openPanels = signal<number[]>([]);
	/** Vista de semanas elegida por el usuario (se recuerda entre visitas). */
	protected readonly layout = signal<ContenidoSemanasLayout>(this.storage.getContenidoSemanasLayout());

	private readonly slotId = computed(() => this.hubContext.slot()?.id ?? null);

	/** Id de la semana vigente (P110-F14); `null` si el BE no pudo derivarla o no existe esa semana. */
	protected readonly semanaVigenteId = computed(() => {
		const vigente = this.vm().contenido?.semanaVigente;
		if (!vigente) return null;
		return this.vm().semanas.find((s) => s.numeroSemana === vigente)?.id ?? null;
	});

	/** Tareas nuevas al abrirse en esta visita: conservan la marca "Nueva" aunque ya se hayan registrado como vistas. */
	private readonly vistasEstaVisita = signal<ReadonlySet<number>>(new Set());

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
				this.vistasEstaVisita.set(new Set());
			});
		});

		// Sin selección previa, se abre la semana vigente (o la primera si el BE no la pudo derivar).
		effect(() => {
			const semanaId = this.semanaVigenteId() ?? this.vm().semanas[0]?.id ?? null;
			if (semanaId === null) return;
			untracked(() => {
				if (this.openPanels().length > 0) return;
				this.onAccordionChangeStr([String(semanaId)]);
			});
		});

		// Una tarea nueva cuenta como vista cuando su semana está expandida (P110-F14, H11).
		effect(() => {
			const abiertas = this.openPanels();
			const nuevas = this.tareasPendientes.nuevasIds();
			const semanas = this.vm().semanas;
			if (nuevas.size === 0) return;
			untracked(() => {
				// Una tarea se intenta una sola vez por visita: si el POST falla, el rollback del
				// servicio vuelve a marcarla nueva y sin este filtro el effect reintentaría en bucle.
				const intentadas = this.vistasEstaVisita();
				const ids = semanas
					.filter((s) => abiertas.includes(s.id))
					.flatMap((s) => s.tareas.map((t) => t.id))
					.filter((id) => nuevas.has(id) && !intentadas.has(id));
				if (ids.length === 0) return;
				this.vistasEstaVisita.update((prev) => new Set([...prev, ...ids]));
				ids.forEach((id) => this.tareasPendientes.marcarVista(id));
			});
		});
	}

	// #region Navegación de semanas
	/** Semana mostrada: la seleccionada si sigue visible; si no, la primera de la lista. */
	protected readonly semanaActiva = computed(() => resolverSemanaActiva(this.filteredSemanas(), this.openPanels()));

	protected readonly navItems = computed<SemanaNavItem[]>(() => {
		const vigente = this.vm().contenido?.semanaVigente ?? null;
		return this.filteredSemanas().map((s) => {
			const examenes = contarExamenes(s.tareas);
			return {
				id: s.id,
				numero: s.numeroSemana,
				titulo: s.titulo ?? null,
				fechaInicio: s.fechaInicio ?? null,
				fechaFin: s.fechaFin ?? null,
				estado: vigente === null ? 'proxima' : s.numeroSemana === vigente ? 'actual' : s.numeroSemana < vigente ? 'pasada' : 'proxima',
				archivos: s.archivos.length,
				tareas: s.tareas.length - examenes,
				examenes,
				proximaFecha: proximaFechaLimite(s.tareas),
				borrador: false,
			};
		});
	});

	protected selectSemana(semanaId: number): void {
		this.onAccordionChangeStr([String(semanaId)]);
	}

	protected setLayout(layout: ContenidoSemanasLayout): void {
		this.layout.set(layout);
		this.storage.setContenidoSemanasLayout(layout);
	}
	// #endregion

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
				this.facade.loadArchivosGrupoSemana(semana.id);
				semana.tareas.forEach((t) => {
					this.facade.loadMisTareaArchivos(t.id);
					if (t.esGrupal) this.facade.loadArchivosGrupoTarea(t.id);
				});
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

	protected onTogglePublicacionMiArchivo(semanaId: number, archivo: EstudianteArchivoDto): void {
		this.facade.cambiarPublicacionArchivo(semanaId, archivo.id, !archivo.publicado);
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

	protected onTogglePublicacionMiTareaArchivo(tareaId: number, archivo: EstudianteTareaArchivoDto): void {
		this.facade.cambiarPublicacionTareaArchivo(tareaId, archivo.id, !archivo.publicado);
	}
	// #endregion

	// #region Helpers
	protected esTareaNueva(tareaId: number): boolean {
		return this.tareasPendientes.nuevasIds().has(tareaId) || this.vistasEstaVisita().has(tareaId);
	}

	protected getMisArchivosSemana(semanaId: number): EstudianteArchivoDto[] {
		return this.vm().misArchivos[semanaId] ?? [];
	}

	protected getMisTareaArchivos(tareaId: number): EstudianteTareaArchivoDto[] {
		return this.vm().misTareaArchivos[tareaId] ?? [];
	}

	/** Archivos publicados de otros miembros de mi grupo en la semana (solo lectura). */
	protected getArchivosGrupoSemana(semanaId: number): EstudianteArchivoDto[] {
		return this.vm().archivosGrupoSemana[semanaId] ?? [];
	}

	/** Entregas publicadas de otros miembros de mi grupo en la tarea (solo lectura). */
	protected getArchivosGrupoTarea(tareaId: number): EstudianteTareaArchivoDto[] {
		return this.vm().archivosGrupoTarea[tareaId] ?? [];
	}

	/**
	 * El contrato no trae un estado de entrega: se deriva de los archivos que el
	 * estudiante subió en «Mi entrega». Solo cuenta lo **publicado**: un borrador no lo
	 * ve el profesor, así que no es una entrega. `null` mientras esos archivos no cargan
	 * (evita mostrar «Pendiente» por un instante a quien ya entregó).
	 */
	protected estadoTarea(tarea: { id: number; fechaLimite: string | null }): TareaEstado | null {
		const entregas = this.vm().misTareaArchivos[tarea.id];
		if (!entregas) return null;
		if (entregas.some((a) => a.publicado)) return TAREA_ESTADO.entregada;
		if (entregas.length > 0) return TAREA_ESTADO.borrador;
		const venceAntesDeHoy = !!tarea.fechaLimite && tarea.fechaLimite.slice(0, 10) < todayIso();
		return venceAntesDeHoy ? TAREA_ESTADO.vencida : TAREA_ESTADO.pendiente;
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
