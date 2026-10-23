import type { EntregaCalificacionDto } from './calificacion.models';

export interface NotaRow {
	estudianteId: number;
	estudianteNombre: string;
	nota: number | null;
	observacion: string;
	existingNotaId: number | null;
	esEditable: boolean;
	/** Entrega de la tarea enlazada; `null` si la evaluación no tiene tarea (INV-C18). */
	entrega?: EntregaCalificacionDto | null;
}

export interface GrupoNotaRow {
	grupoId: number;
	grupoNombre: string;
	nota: number | null;
	observacion: string;
	miembros: GrupoMiembroInfo[];
	/** Entrega del grupo (estado, fecha y archivos de todos sus miembros); `null` sin tarea enlazada. */
	entrega?: EntregaCalificacionDto | null;
}

export interface GrupoMiembroInfo {
	estudianteId: number;
	nombre: string;
	notaActual: number | null;
	esOverride: boolean;
	overrideNota: number | null;
	/** Observación ya guardada del miembro; se reenvía en el guardado para que el BE no la sobrescriba con null. */
	observacion: string;
}
