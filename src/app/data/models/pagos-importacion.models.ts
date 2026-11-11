// Contrato de la importación de saldos iniciales, pagos adelantados y descuentos (P119 F6c).
// Ver `educa-coord/contracts/api-catalog.md` § Pagos (`/api/pagos/importacion/*`).

// #region Importación (F6c)
export type TipoFilaImportacion = 'SALDO' | 'PAGO' | 'DESCUENTO';

/**
 * Una fila de la plantilla: un hecho sobre un cargo (alumno + concepto + cuota). `numero` es la fila de la hoja.
 * Los enums viajan como texto: lo que el BE no reconoce vuelve como `INVALIDA` con el mensaje de la regla.
 * `fecha` es una fecha civil `YYYY-MM-DD`; `hora`, `HH:mm`.
 */
export interface FilaImportacion {
	numero: number;
	dni?: string;
	apellidos?: string;
	nombres?: string;
	grado?: string;
	salon?: string;
	concepto: string;
	cuota?: number;
	tipo: string;
	estado?: string;
	monto?: number;
	fecha?: string;
	medio?: string;
	comprobante?: string;
	numeroOperacion?: string;
	bancoOrigen?: string;
	hora?: string;
	motivo?: string;
	/** Lo manda el FE cuando la persona resolvió a mano un cruce ambiguo. */
	estudianteId?: number;
}

/** Cuerpo de `POST /api/pagos/importacion/vista-previa`. Hasta 3000 filas por vez. */
export interface ImportacionPayload {
	anio: number;
	filas: FilaImportacion[];
}

/** Cuerpo de `POST /api/pagos/importacion/confirmar`. `filasEsperadas` = `aplicables` de la vista previa. */
export interface ConfirmarImportacionPayload extends ImportacionPayload {
	filasEsperadas: number;
}

export type EstadoFilaImportacion = 'LISTA' | 'ALERTA' | 'YA_EXISTE' | 'SIN_RESOLVER' | 'SIN_CARGO' | 'INVALIDA';

export interface CandidatoImportacion {
	estudianteId: number;
	nombre: string;
	salon: string | null;
}

export interface FilaEvaluada {
	numero: number;
	estado: EstadoFilaImportacion;
	mensaje: string | null;
	estudianteId: number | null;
	alumno: string | null;
	cargoId: number | null;
	candidatos: CandidatoImportacion[];
}

export interface VistaPreviaImportacion {
	anio: number;
	/** `LISTA` + `ALERTA`: lo que `confirmar` va a aplicar. */
	aplicables: number;
	porEstado: { estado: EstadoFilaImportacion; cantidad: number }[];
	filas: FilaEvaluada[];
}

export interface FilaFallida {
	numero: number;
	mensaje: string;
}

export interface ResultadoImportacion {
	saldosConfirmados: number;
	pagos: number;
	descuentos: number;
	fallidas: FilaFallida[];
}
// #endregion
