import type { FilaImportacion } from '@data/models';

/**
 * Plantilla de Excel de la importación (P119 F6c): hoja «Datos», una fila por hecho. Las columnas siguen el diseño
 * (`xrepo-119-f6c-importacion-diseno.md`); `UTILES` queda fuera de la primera carga (E10).
 */

export interface ColumnaPlantilla {
	header: string;
	key: keyof FilaImportacion;
	width: number;
}

/** Columnas de la hoja «Datos», en el orden del diseño (`xrepo-119-f6c-importacion-diseno.md`). */
export const COLUMNAS_PLANTILLA: readonly ColumnaPlantilla[] = [
	{ header: 'DNI', key: 'dni', width: 12 },
	{ header: 'Apellidos', key: 'apellidos', width: 24 },
	{ header: 'Nombres', key: 'nombres', width: 22 },
	{ header: 'Grado', key: 'grado', width: 18 },
	{ header: 'Salón', key: 'salon', width: 10 },
	{ header: 'Concepto', key: 'concepto', width: 14 },
	{ header: 'Cuota', key: 'cuota', width: 8 },
	{ header: 'Tipo', key: 'tipo', width: 12 },
	{ header: 'Estado', key: 'estado', width: 10 },
	{ header: 'Monto', key: 'monto', width: 10 },
	{ header: 'Fecha', key: 'fecha', width: 12 },
	{ header: 'Medio', key: 'medio', width: 15 },
	{ header: 'Comprobante', key: 'comprobante', width: 14 },
	{ header: 'NumeroOperacion', key: 'numeroOperacion', width: 18 },
	{ header: 'BancoOrigen', key: 'bancoOrigen', width: 14 },
	{ header: 'Hora', key: 'hora', width: 8 },
	{ header: 'Motivo', key: 'motivo', width: 24 },
];

/** Todo como texto: Excel no reinterpreta fechas, DNI con ceros ni montos al abrir la plantilla. `UTILES` no se ofrece (E10). */
export const FILAS_EJEMPLO: readonly Record<string, string>[] = [
	{ dni: '70123456', apellidos: 'Quispe Rojas', nombres: 'Ana', grado: '3.º Primaria', concepto: 'MATRICULA', tipo: 'SALDO', estado: 'SALDADO' },
	{ apellidos: 'Torres Vega', nombres: 'Luis', grado: '3.º Primaria', concepto: 'PENSION', cuota: '9', tipo: 'SALDO', estado: 'DEBE' },
	{
		dni: '70987654',
		apellidos: 'Mamani Cruz',
		nombres: 'Rosa',
		grado: '5.º Primaria',
		concepto: 'PENSION',
		cuota: '10',
		tipo: 'PAGO',
		monto: '450.00',
		fecha: '05/10/2026',
		medio: 'EFECTIVO',
		comprobante: 'S/N',
	},
	{
		dni: '71000111',
		apellidos: 'Salas Ponce',
		nombres: 'Juan',
		grado: '1.º Secundaria',
		concepto: 'PENSION',
		cuota: '11',
		tipo: 'DESCUENTO',
		monto: '100.00',
		motivo: 'Hermano menor',
	},
];

export const NOMBRE_PLANTILLA = 'Plantilla_Importacion_Pagos.xlsx';
