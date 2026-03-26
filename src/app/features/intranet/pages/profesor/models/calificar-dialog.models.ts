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
}
