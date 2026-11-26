// #region Mis pagos (estudiante) — xrepo-124 F8, INV-PG17
/**
 * Estado de cuenta tal como lo entrega `GET /api/mis-pagos/estado-cuenta` al propio estudiante.
 * Es una lista blanca del servidor: NO reutilizar los tipos del colegio (`EstadoCuenta`, `CuentaCargo`),
 * que traen ajustes, bancos y usuarios que el estudiante nunca ve. El FE no recalcula nada.
 */
export type MiCargoEstado = 'Pagado' | 'Vencida' | 'EnPlazo' | 'Pendiente' | 'EnRevision';

export interface MiCargoDetalle {
	vencimiento: string | null;
	/** Monto neto (base − ajuste): no revela que hubo un ajuste. */
	montoAPagar: number;
	pagado: number;
	recargo: number;
	saldo: number;
}

export interface MiCargo {
	concepto: string;
	cuota: string | null;
	anio: number;
	estado: MiCargoEstado;
	/** Texto del colegio para lo «sin dato»: «En revisión por el colegio». */
	mensaje: string | null;
	/** `null` cuando el estado es `EnRevision`: sin monto, saldo, recargo ni vencimiento. */
	detalle: MiCargoDetalle | null;
}

export interface MiAplicacion {
	concepto: string;
	cuota: string | null;
	anio: number;
	monto: number;
}

export interface MiPago {
	fechaPago: string;
	/** `HH:mm:ss` (TimeSpan del servidor). */
	horaPago: string | null;
	medio: string;
	comprobante: string;
	/** `false` = anulado, sin motivo ni usuario. */
	vigente: boolean;
	/** Solo la parte aplicada a este estudiante; nunca el total del pago de familia. */
	montoAplicado: number;
	aplicaciones: MiAplicacion[];
}

export interface MisPagos {
	fecha: string;
	estudiante: string;
	salon: string | null;
	tieneCargosEnRevision: boolean;
	deudaVencida: number;
	pendienteTotal: number;
	cargos: MiCargo[];
	pagos: MiPago[];
}
// #endregion
