import { Observable } from 'rxjs';
import { AttendanceService } from '@core/services';

export type TipoReporte =
	| 'salon-dia'
	| 'salon-mes'
	| 'salon-anio'
	| 'todos-dia'
	| 'todos-semana'
	| 'todos-mes'
	| 'todos-anio';

export interface TipoReporteOption {
	label: string;
	value: TipoReporte;
}

export interface TipoReporteGroup {
	label: string;
	items: TipoReporteOption[];
}

export const TIPO_REPORTE_OPTIONS: TipoReporteGroup[] = [
	{
		label: 'Este salón',
		items: [
			{ label: 'Día', value: 'salon-dia' },
			{ label: 'Mes', value: 'salon-mes' },
			{ label: 'Año', value: 'salon-anio' },
		],
	},
	{
		label: 'Todos los salones',
		items: [
			{ label: 'Día', value: 'todos-dia' },
			{ label: 'Semana', value: 'todos-semana' },
			{ label: 'Mes', value: 'todos-mes' },
			{ label: 'Año', value: 'todos-anio' },
		],
	},
];

/** Calcula el lunes de la semana de una fecha dada */
export function getInicioSemana(fecha: Date): Date {
	const dia = fecha.getDay();
	const diff = dia === 0 ? -6 : 1 - dia;
	const lunes = new Date(fecha);
	lunes.setDate(fecha.getDate() + diff);
	return lunes;
}

/** Obtiene el Observable para reportes de todos los salones usando fecha como contexto */
export function getTodosSalonesObservable(
	service: AttendanceService,
	tipo: TipoReporte,
	fecha: Date,
): Observable<Blob> | null {
	const mes = fecha.getMonth() + 1;
	const anio = fecha.getFullYear();
	switch (tipo) {
		case 'todos-dia':
			return service.descargarPdfTodosSalonesDia(fecha);
		case 'todos-semana':
			return service.descargarPdfTodosSalonesSemana(getInicioSemana(fecha));
		case 'todos-mes':
			return service.descargarPdfTodosSalonesMes(mes, anio);
		case 'todos-anio':
			return service.descargarPdfTodosSalonesAnio(anio);
		default:
			return null;
	}
}

/** Nombre de archivo para el reporte consolidado */
export function getConsolidadoFileName(tipo: TipoReporte, fecha: Date): string {
	const mes = fecha.getMonth() + 1;
	const anio = fecha.getFullYear();
	const fechaStr = fecha.toISOString().split('T')[0];
	switch (tipo) {
		case 'todos-dia':
			return `Reporte_TodosSalones_${fechaStr}.pdf`;
		case 'todos-semana': {
			const semanaStr = getInicioSemana(fecha).toISOString().split('T')[0];
			return `Reporte_TodosSalones_Semana_${semanaStr}.pdf`;
		}
		case 'todos-mes':
			return `Reporte_TodosSalones_${anio}-${mes.toString().padStart(2, '0')}.pdf`;
		case 'todos-anio':
			return `Reporte_TodosSalones_${anio}.pdf`;
		default:
			return 'Reporte_TodosSalones.pdf';
	}
}
