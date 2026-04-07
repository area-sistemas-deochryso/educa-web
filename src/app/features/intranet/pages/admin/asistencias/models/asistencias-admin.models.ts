export type {
	AsistenciaAdminLista,
	AsistenciaAdminEstadisticas,
	CrearEntradaManualRequest,
	CrearSalidaManualRequest,
	CrearAsistenciaCompletaRequest,
	ActualizarHorasRequest,
	EstudianteParaSeleccion,
	CierreMensualLista,
	CrearCierreMensualRequest,
	RevertirCierreMensualRequest,
	TipoOperacionAsistencia,
} from '@data/models/asistencia-admin.models';

// Form data local al feature.
export interface AsistenciaFormData {
	tipoOperacion: 'entrada' | 'salida' | 'completa';
	estudianteId: number | null;
	sedeId: number | null;
	horaEntrada: Date | null;
	horaSalida: Date | null;
	observacion: string;
	asistenciaId: number | null;
}
