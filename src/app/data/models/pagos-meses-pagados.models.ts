import type { PagosSalonOpcion } from './pagos.models';

// #region Meses pagados por aula (xrepo-124 F2)
export type MesesPagadosEstado = 'Pagado' | 'Vencida' | 'EnPlazo' | 'Pendiente' | 'SinDato' | 'SinCargo' | 'NoAplica';

export interface MesesPagadosCelda {
	estado: MesesPagadosEstado;
	/** Incluye el recargo; es 0 salvo en `Vencida`, `EnPlazo` y `Pendiente`. */
	saldo: number;
}

export interface MesesPagadosPension {
	numero: number;
	etiqueta: string;
	vencimiento: string;
}

export interface MesesPagadosFila {
	estudianteId: number;
	estudiante: string;
	/** Informativas (INV-PG19): nunca `Vencida` y no suman a `mesesPagados`. */
	matricula: MesesPagadosCelda;
	inscripcion: MesesPagadosCelda;
	utiles: MesesPagadosCelda;
	/** Mismo orden que `MesesPagados.pensiones`. */
	pensiones: MesesPagadosCelda[];
	mesesPagados: number;
}

export interface MesesPagados {
	fecha: string;
	anio: number;
	anioSinParametros: boolean;
	anioSinCronograma: boolean;
	salonId: number;
	salon: string;
	salones: PagosSalonOpcion[];
	pensiones: MesesPagadosPension[];
	totales: { alumnos: number; pensionesPagadas: number[]; mesesPagados: number };
	filas: MesesPagadosFila[];
}

export interface MesesPagadosFiltros {
	salonId: number;
	fecha?: string | null;
	buscar?: string;
}
// #endregion
