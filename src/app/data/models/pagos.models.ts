// #region Contrato de pagos y cobranza (educa-coord/contracts/api-catalog.md § «Pagos y cobranza»)
/** Montos: `decimal` con 2 decimales en el servidor. Aquí solo se muestran; el cuadre del reparto (F5b) usa centavos. */
export type PagosCategoria = 'AlDia' | 'PagoParcial' | 'ConDeuda';

export interface PagosConteos {
	alDia: number;
	pagoParcial: number;
	conDeuda: number;
	/** Transversal: no suma al total. */
	conDatosSinConfirmar: number;
	/** Transversal: un alumno sin cargos del año cuenta como «al día»; este conteo evita leerlo como cobranza real. */
	sinCargos: number;
}

export interface PagosPorNivel {
	nivel: string;
	matriculados: number;
	alDia: number;
	porcentaje: number | null;
}

export interface PagosDinero {
	exigible: number;
	cobradoDeLoExigible: number;
	cobradoTotal: number;
	porcentaje: number | null;
	saldoVencido: number;
	indiceMorosidad: number | null;
}

export interface PagosAsistencia {
	desde: string;
	hasta: string;
	universo: number;
	asistieron: number;
	porcentaje: number | null;
}

export interface PagosAgingTramo {
	etiqueta: string;
	desde: number;
	/** `null` en el último tramo («Más de 90 días»). */
	hasta: number | null;
	saldo: number;
	cuotas: number;
	alumnos: number;
}

export interface PagosOportuna {
	cuotasExigibles: number;
	cuotasOportunas: number;
	porcentaje: number | null;
}

export interface PanelCobranza {
	/** Fecha de la foto (el corte elegido, u hoy). */
	fecha: string;
	anio: number;
	matriculados: number;
	conteos: PagosConteos;
	porcentajeAlDia: number | null;
	porNivel: PagosPorNivel[];
	dinero: PagosDinero;
	asistencia: PagosAsistencia;
	aging: PagosAgingTramo[];
	oportuna: PagosOportuna;
	/** Faltan los parámetros de cobranza del año: no se calcula deuda. */
	anioSinParametros: boolean;
}

export interface PagosUltimoPago {
	fecha: string;
	monto: number;
}

export interface QuienDebeCuota {
	cargoId: number;
	concepto: string;
	cuota: string | null;
	vencimiento: string;
	diasAtraso: number;
	saldo: number;
	recargo: number;
}

export interface QuienDebeFila {
	estudianteId: number;
	estudiante: string;
	salonId: number;
	salon: string;
	categoria: PagosCategoria;
	cuotasVencidas: number;
	diasAtrasoMaximo: number;
	deudaVencida: number;
	ultimoPago: PagosUltimoPago | null;
	cuotas: QuienDebeCuota[];
}

export interface PagosSalonOpcion {
	salonId: number;
	nombre: string;
}

export interface QuienesDeben {
	fecha: string;
	anioSinParametros: boolean;
	totales: { alumnos: number; cuotas: number; deuda: number };
	salones: PagosSalonOpcion[];
	filas: { data: QuienDebeFila[]; total: number; page: number; pageSize: number };
}

export type QuienesDebenOrden = 'estudiante' | 'salon' | 'deuda' | 'cuotas' | 'atraso' | 'categoria';

export interface QuienesDebenFiltros {
	fecha?: string | null;
	buscar?: string;
	salonId?: number | null;
	orden?: QuienesDebenOrden | null;
	descendente?: boolean;
	page?: number;
	pageSize?: number;
}

export interface PagoCorte {
	anio: number;
	mes: number;
	fecha: string;
}
// #endregion

// #region Registrar pago
export type PagoMedio = 'EFECTIVO' | 'TRANSFERENCIA' | 'DEPOSITO' | 'YAPE' | 'PLIN' | 'OTRO';

/** Aplicación propuesta por el servidor (`POST /api/pagos/reparto/proponer`). Editable en cliente. */
export interface RepartoAplicacion {
	cargoId: number;
	estudianteId: number;
	estudiante: string;
	concepto: string;
	cuota: string | null;
	vencimiento: string | null;
	montoBase: number;
	montoRecargo: number;
}

export interface RepartoPropuesto {
	aplicaciones: RepartoAplicacion[];
	sobrante: number;
}

/** Alumno del grupo familiar (`GET /api/pagos/estudiantes/{id}/familia`). */
export interface MiembroFamilia {
	estudianteId: number;
	nombreCompleto: string;
}

export interface RegistrarPagoAplicacion {
	cargoId: number;
	montoBase: number;
	montoRecargo: number;
}

/** Cuerpo de `POST /api/pagos`. El reparto va ya confirmado por la persona. */
export interface RegistrarPagoPayload {
	monto: number;
	fechaPago: string;
	horaPago: string | null;
	medio: PagoMedio;
	bancoOrigen: string | null;
	numeroOperacion: string | null;
	comprobante: string;
	observaciones: string | null;
	aplicaciones: RegistrarPagoAplicacion[];
}
// #endregion
