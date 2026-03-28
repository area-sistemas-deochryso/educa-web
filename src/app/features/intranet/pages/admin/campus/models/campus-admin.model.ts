// #region DTOs from API

export interface CampusPisoDto {
	id: number;
	nombre: string;
	orden: number;
	alturaMetros: number;
	estado: boolean;
	cantidadNodos: number;
	cantidadAristas: number;
	cantidadBloqueos: number;
}

export interface CampusNodoDto {
	id: number;
	pisoId: number;
	salonId: number | null;
	salonDescripcion: string | null;
	tipo: string;
	etiqueta: string | null;
	x: number;
	y: number;
	width: number;
	height: number;
	rotation: number;
	metadataJson: string | null;
	estado: boolean;
}

export interface CampusAristaDto {
	id: number;
	nodoOrigenId: number;
	nodoDestinoId: number;
	peso: number;
	bidireccional: boolean;
	estado: boolean;
}

export interface CampusBloqueoDto {
	id: number;
	pisoId: number;
	x: number;
	y: number;
	width: number;
	height: number;
	motivo: string | null;
	estado: boolean;
}

export interface CampusConexionVerticalDto {
	id: number;
	nodoOrigenId: number;
	nodoDestinoId: number;
	tipo: string;
	pesoSubida: number;
	pesoBajada: number;
	bidireccional: boolean;
	estado: boolean;
	pisoOrigenId: number;
	pisoOrigenNombre: string;
	pisoDestinoId: number;
	pisoDestinoNombre: string;
}

export interface CampusPisoCompletoDto {
	id: number;
	nombre: string;
	orden: number;
	alturaMetros: number;
	nodos: CampusNodoDto[];
	aristas: CampusAristaDto[];
	bloqueos: CampusBloqueoDto[];
	conexionesVerticales: CampusConexionVerticalDto[];
}

export interface CampusCompletoDto {
	sedeId: number;
	sedeNombre: string;
	pisos: CampusPisoCompletoDto[];
	conexionesVerticales: CampusConexionVerticalDto[];
}

// #endregion

// #region Crear/Actualizar DTOs

export interface CrearPisoDto {
	nombre: string;
	orden: number;
	alturaMetros: number;
}

export interface ActualizarPisoDto {
	nombre: string;
	orden: number;
	alturaMetros: number;
}

export interface CrearNodoDto {
	pisoId: number;
	salonId: number | null;
	tipo: string;
	etiqueta: string | null;
	x: number;
	y: number;
	width: number;
	height: number;
	rotation: number;
	metadataJson: string | null;
}

export interface ActualizarNodoDto {
	salonId: number | null;
	tipo: string;
	etiqueta: string | null;
	x: number;
	y: number;
	width: number;
	height: number;
	rotation: number;
	metadataJson: string | null;
}

export interface CrearAristaDto {
	nodoOrigenId: number;
	nodoDestinoId: number;
	peso: number;
	bidireccional: boolean;
}

export interface ActualizarAristaDto {
	peso: number;
	bidireccional: boolean;
}

export interface CrearBloqueoDto {
	pisoId: number;
	x: number;
	y: number;
	width: number;
	height: number;
	motivo: string | null;
}

export interface ActualizarBloqueoDto {
	x: number;
	y: number;
	width: number;
	height: number;
	motivo: string | null;
}

export interface CrearConexionVerticalDto {
	nodoOrigenId: number;
	nodoDestinoId: number;
	tipo: string;
	pesoSubida: number;
	pesoBajada: number;
	bidireccional: boolean;
}

export interface ActualizarConexionVerticalDto {
	tipo: string;
	pesoSubida: number;
	pesoBajada: number;
	bidireccional: boolean;
}

// #endregion

// #region Form data types

export interface PisoFormData {
	nombre: string;
	orden: number;
	alturaMetros: number;
}

export interface NodeFormData {
	etiqueta: string;
	tipo: EditorNodeType;
	width: number;
	height: number;
}

export interface BloqueoFormData {
	motivo: string;
	width: number;
	height: number;
}

export interface VerticalConnectionFormData {
	tipo: VerticalConnectionType;
	destPisoId: number | null;
	destNodoId: number | null;
	pesoSubida: number;
	pesoBajada: number;
	bidireccional: boolean;
}

// #endregion

// #region Editor types

export type EditorTool = 'select' | 'addNode' | 'addEdge' | 'addBlock' | 'addVertical' | 'delete';

export type VerticalConnectionType = 'escalera' | 'ascensor' | 'rampa';

export type EditorNodeType = 'classroom' | 'corridor' | 'stairs' | 'entrance' | 'patio' | 'bathroom' | 'office';

export const NODE_TYPE_OPTIONS: { label: string; value: EditorNodeType }[] = [
	{ label: 'Salón', value: 'classroom' },
	{ label: 'Pasillo', value: 'corridor' },
	{ label: 'Escaleras', value: 'stairs' },
	{ label: 'Entrada', value: 'entrance' },
	{ label: 'Patio', value: 'patio' },
	{ label: 'Baño', value: 'bathroom' },
	{ label: 'Oficina', value: 'office' },
];

export const VERTICAL_CONNECTION_TYPE_OPTIONS: { label: string; value: VerticalConnectionType }[] = [
	{ label: 'Escalera', value: 'escalera' },
	{ label: 'Ascensor', value: 'ascensor' },
	{ label: 'Rampa', value: 'rampa' },
];

// #endregion
