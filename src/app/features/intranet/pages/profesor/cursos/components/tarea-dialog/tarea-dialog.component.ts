// #region Imports
import { Component, ChangeDetectionStrategy, input, output, OnChanges, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { toLocalIso } from '@core/helpers';
import { CalificacionDto, ContenidoTareaTipo, CursoContenidoTareaDto, CrearTareaRequest, ActualizarTareaRequest } from '@features/intranet/pages/profesor/models';
import { EduButton, EduDatePicker, EduDialog, EduInputText, EduSelect, EduTextarea, EduToggle } from '@edu-ui';

// #endregion
// #region Implementation
@Component({
	selector: 'app-tarea-dialog',
	standalone: true,
	imports: [
		FormsModule,
		EduDialog,
		EduButton,
		EduInputText,
		EduTextarea,
		EduDatePicker,
		EduSelect,
		EduToggle],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './tarea-dialog.component.html',
	styleUrl: './tarea-dialog.component.scss',
})
export class TareaDialogComponent implements OnChanges {
	readonly visible = input.required<boolean>();
	readonly tarea = input.required<CursoContenidoTareaDto | null>();
	readonly saving = input<boolean>(false);
	/** Tipo preseleccionado al crear (el menú Agregar de la semana lo fija). */
	readonly tipoInicial = input<ContenidoTareaTipo>('TAREA');
	/** Evaluación enlazada a esta tarea (INV-C16); `null` si todavía no es calificable. */
	readonly evaluacionEnlazada = input<CalificacionDto | null>(null);
	/** Evaluaciones del mismo curso sin tarea, candidatas a enlazar. */
	readonly evaluacionesEnlazables = input<CalificacionDto[]>([]);
	readonly calificacionesLoading = input(false);

	readonly visibleChange = output<boolean>();
	readonly createTarea = output<CrearTareaRequest>();
	readonly updateTarea = output<ActualizarTareaRequest>();
	readonly crearEvaluacion = output<void>();
	readonly enlazarEvaluacion = output<number>();
	readonly irAEvaluacion = output<number>();

	titulo = '';
	descripcion = '';
	fechaLimite: Date | null = null;
	esGrupal = false;
	tipo: ContenidoTareaTipo = 'TAREA';
	duracionMinutos: number | null = null;
	evaluacionAEnlazar: number | null = null;

	readonly tipoOptions: { value: ContenidoTareaTipo; label: string; hint: string; icon: string }[] = [
		{ value: 'TAREA', label: 'Tarea', hint: 'Trabajo para casa', icon: 'pi-file-edit' },
		{ value: 'ACTIVIDAD', label: 'Actividad', hint: 'Se trabaja en clase', icon: 'pi-pencil' },
		{ value: 'EXAMEN', label: 'Examen', hint: 'Evaluación con duración', icon: 'pi-verified' },
	];

	etiqueta(): string {
		return this.tipoOptions.find((o) => o.value === this.tipo)?.label ?? 'Tarea';
	}

	/** Artículo definido para "crear la tarea / el examen". */
	articulo(): string {
		return this.tipo === 'EXAMEN' ? 'el' : 'la';
	}

	/** Contracción para "instrucciones de la tarea / del examen". */
	deLaEtiqueta(): string {
		const etiqueta = this.etiqueta().toLowerCase();
		return this.tipo === 'EXAMEN' ? `del ${etiqueta}` : `de la ${etiqueta}`;
	}

	headerText(): string {
		const etiqueta = this.etiqueta();
		if (this.tarea()) return `Editar ${etiqueta}`;
		return this.tipo === 'EXAMEN' ? `Nuevo ${etiqueta}` : `Nueva ${etiqueta}`;
	}

	/** Solo se acota al crear una tarea nueva — editar una tarea ya vencida sigue permitido. */
	minFechaLimite: Date | null = null;
	/** El título falta y el docente ya intentó crear: se explica en vez de dejar el botón mudo. */
	intentoGuardar = false;

	private baseline = { titulo: '', descripcion: '', fecha: null as number | null, esGrupal: false, tipo: 'TAREA' as ContenidoTareaTipo, duracion: null as number | null };

	mostrarErrorTitulo(): boolean {
		return this.intentoGuardar && !this.titulo.trim();
	}

	dirty(): boolean {
		const b = this.baseline;
		return (
			this.titulo !== b.titulo ||
			this.descripcion !== b.descripcion ||
			(this.fechaLimite?.getTime() ?? null) !== b.fecha ||
			this.esGrupal !== b.esGrupal ||
			this.tipo !== b.tipo ||
			this.duracionMinutos !== b.duracion
		);
	}

	ngOnChanges(changes: SimpleChanges): void {
		if (changes['tarea'] || changes['visible'] || changes['tipoInicial']) {
			const t = this.tarea();
			if (this.visible()) {
				if (t) {
					this.titulo = t.titulo;
					this.descripcion = t.descripcion ?? '';
					this.fechaLimite = t.fechaLimite ? new Date(t.fechaLimite) : null;
					this.esGrupal = t.esGrupal;
					this.tipo = t.tipo ?? 'TAREA';
					this.duracionMinutos = t.duracionMinutos ?? null;
					this.minFechaLimite = null;
				} else {
					this.titulo = '';
					this.descripcion = '';
					this.fechaLimite = null;
					this.esGrupal = false;
					this.tipo = this.tipoInicial();
					this.duracionMinutos = null;
					this.minFechaLimite = new Date();
				}
				this.intentoGuardar = false;
				this.baseline = {
					titulo: this.titulo,
					descripcion: this.descripcion,
					fecha: this.fechaLimite?.getTime() ?? null,
					esGrupal: this.esGrupal,
					tipo: this.tipo,
					duracion: this.duracionMinutos,
				};
			}
		}
	}

	/** Solo tareas y actividades ya guardadas pueden hacerse calificables; el examen queda fuera de F5. */
	puedeSerCalificable(): boolean {
		return !!this.tarea() && this.tipo !== 'EXAMEN';
	}

	pesoLabel(cal: CalificacionDto): string {
		return `${Math.round(cal.peso * 100)}%`;
	}

	onEnlazar(): void {
		if (this.evaluacionAEnlazar === null) return;
		this.enlazarEvaluacion.emit(this.evaluacionAEnlazar);
		this.evaluacionAEnlazar = null;
	}

	onVisibleChange(value: boolean): void {
		if (!value) {
			this.visibleChange.emit(false);
		}
	}

	onSave(): void {
		if (!this.titulo.trim()) {
			this.intentoGuardar = true;
			return;
		}

		const fechaStr = this.fechaLimite ? toLocalIso(this.fechaLimite) : null;

		if (this.tarea()) {
			this.updateTarea.emit({
				titulo: this.titulo.trim(),
				descripcion: this.descripcion.trim() || null,
				fechaLimite: fechaStr,
				esGrupal: this.esGrupal,
				tipo: this.tipo,
				duracionMinutos: this.tipo === 'EXAMEN' ? this.duracionMinutos : null,
			});
		} else {
			this.createTarea.emit({
				titulo: this.titulo.trim(),
				descripcion: this.descripcion.trim() || null,
				fechaLimite: fechaStr,
				esGrupal: this.esGrupal,
				tipo: this.tipo,
				duracionMinutos: this.tipo === 'EXAMEN' ? this.duracionMinutos : null,
			});
		}
	}
}
// #endregion
