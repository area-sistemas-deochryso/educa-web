export interface NotaRow {
	estudianteId: number;
	estudianteNombre: string;
	nota: number | null;
	observacion: string;
	existingNotaId: number | null;
	esEditable: boolean;
}

export interface GrupoNotaRow {
	grupoId: number;
	grupoNombre: string;
	nota: number | null;
	observacion: string;
	miembros: GrupoMiembroInfo[];
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
