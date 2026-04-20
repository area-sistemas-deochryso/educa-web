export type {
	AsistenciaAdminLista,
	AsistenciaAdminEstadisticas,
	CrearEntradaManualRequest,
	CrearSalidaManualRequest,
	CrearAsistenciaCompletaRequest,
	ActualizarHorasRequest,
	EstudianteParaSeleccion,
	PersonaParaSeleccion,
	CierreMensualLista,
	CrearCierreMensualRequest,
	RevertirCierreMensualRequest,
	TipoOperacionAsistencia,
	EnviarCorreosAsistenciaRequest,
	EnviarCorreosResultado,
	TipoPersonaAsistencia,
	TipoPersonaFilter,
	SincronizarResultado,
	SincronizarTipoResultado,
} from '@data/models/attendance-admin.models';

import type { TipoPersonaAsistencia } from '@data/models/attendance-admin.models';

// Form data local al feature.
export interface AsistenciaFormData {
	tipoOperacion: 'entrada' | 'salida' | 'completa';
	estudianteId: number | null;
	sedeId: number | null;
	horaEntrada: Date | null;
	horaSalida: Date | null;
	observacion: string;
	asistenciaId: number | null;
	tipoPersona: TipoPersonaAsistencia;
}
