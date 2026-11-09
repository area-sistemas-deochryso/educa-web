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

/** Resultado del buscador de alumnos (`GET /api/pagos/estudiantes?buscar=`). `salon` es null sin matrícula activa. */
export interface EstudianteBusqueda {
	estudianteId: number;
	nombreCompleto: string;
	salon: { nombre: string } | null;
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

// #region Estado de cuenta y sin dato
export type CargoEstado = 'Pagado' | 'Vencida' | 'EnPlazo' | 'Pendiente' | 'SinDato';

export interface CuentaCargo {
	cargoId: number;
	concepto: string;
	cuota: string | null;
	anio: number;
	vencimiento: string | null;
	fueraDeFechaDesde: string | null;
	montoBase: number;
	ajuste: number;
	pagadoBase: number;
	pagadoRecargo: number;
	recargo: number;
	recargoCongelado: boolean;
	recargoOrigen: 'Ninguno' | 'Calculado' | 'Congelado' | 'ExentoPorPagoATiempo';
	/** Un cargo `SinDato` nunca trae saldo ni recargo (INV-PG14). */
	saldo: number;
	estado: CargoEstado;
	datoConfirmado: boolean;
	anioSinParametros: boolean;
}

export interface CuentaPago {
	pagoId: number;
	fechaPago: string;
	/** `HH:mm:ss` (TimeSpan del servidor). */
	horaPago: string | null;
	/** Total del pago; en un pago de familia puede cubrir a otros alumnos. */
	monto: number;
	montoAplicadoAlumno: number;
	medio: string;
	bancoOrigen: string | null;
	numeroOperacion: string | null;
	comprobante: string;
	observaciones: string | null;
	/** `false` = anulado: sigue en la lista, con motivo, usuario y fecha. */
	vigente: boolean;
	motivoAnulacion: string | null;
	usuarioAnulacion: string | null;
	fechaAnulacion: string | null;
	usuarioReg: string;
	fechaReg: string;
	aplicaciones: { cargoId: number; montoBase: number; montoRecargo: number }[];
}

export interface CuentaAjuste {
	ajusteId: number;
	cargoId: number;
	tipo: 'DESCUENTO' | 'ESPECIE';
	monto: number;
	motivo: string | null;
	vigente: boolean;
	motivoAnulacion: string | null;
	usuarioAnulacion: string | null;
	fechaAnulacion: string | null;
	usuarioReg: string;
	fechaReg: string;
}

/** Cuerpo de `POST /api/pagos/ajustes`. El motivo es obligatorio solo en `DESCUENTO` (INV-PG08). */
export interface RegistrarAjustePayload {
	cargoId: number;
	tipo: CuentaAjuste['tipo'];
	monto: number;
	motivo: string | null;
}

/** `GET /api/pagos/estudiantes/{id}/estado-cuenta`. No excluye `::TEST` (INV-PG12). */
export interface EstadoCuenta {
	estudianteId: number;
	estudiante: string;
	fecha: string;
	categoria: PagosCategoria;
	/** Transversal: no reemplaza la categoría. */
	tieneDatosSinConfirmar: boolean;
	cargosSinDato: number;
	deudaVencida: number;
	pendienteTotal: number;
	cargos: CuentaCargo[];
	pagos: CuentaPago[];
	ajustes: CuentaAjuste[];
	/** `null` sin matrícula activa: la cuenta se devuelve completa igual. */
	salonId: number | null;
	salon: string | null;
}

export interface SinDatoCargo {
	cargoId: number;
	concepto: string;
	cuota: string | null;
	vencimiento: string | null;
	montoBase: number;
}

export interface SinDatoFila {
	estudianteId: number;
	estudiante: string;
	salonId: number;
	salon: string;
	cargos: number;
	detalle: SinDatoCargo[];
}

/** `GET /api/pagos/sin-dato`. Refleja hoy, sin fecha. */
export interface SinDato {
	fecha: string;
	alumnos: number;
	cargos: number;
	salones: PagosSalonOpcion[];
	filas: { data: SinDatoFila[]; total: number; page: number; pageSize: number };
}

export interface SinDatoFiltros {
	buscar?: string;
	salonId?: number | null;
	page?: number;
	pageSize?: number;
}
// #endregion
