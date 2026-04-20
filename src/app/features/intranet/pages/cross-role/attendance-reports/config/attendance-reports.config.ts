import type { SelectOption, EstadoFiltro, RangoTipo, TipoPersonaReporte } from '../models';
import type { SkeletonColumnDef } from '@intranet-shared/components/table-skeleton/table-skeleton.types';

export const ESTADO_OPTIONS: SelectOption<EstadoFiltro>[] = [
	{ label: 'Todos', value: 'todos' },
	{ label: 'Ausentes', value: 'faltando' },
	{ label: 'Asistieron', value: 'viniendo' },
	{ label: 'Tardanzas', value: 'tarde' },
	{ label: 'Tardanza', value: 'temprano' },
];

export const RANGO_OPTIONS: SelectOption<RangoTipo>[] = [
	{ label: 'Día', value: 'dia' },
	{ label: 'Semana', value: 'semana' },
	{ label: 'Mes', value: 'mes' },
];

export const TIPO_PERSONA_OPTIONS: SelectOption<TipoPersonaReporte>[] = [
	{ label: 'Estudiantes', value: 'E' },
	{ label: 'Profesores', value: 'P' },
	{ label: 'Todos', value: 'todos' },
];

export const TABLE_SKELETON_COLUMNS: SkeletonColumnDef[] = [
	{ width: '50px', cellType: 'text' },
	{ width: '90px', cellType: 'text' },
	{ width: 'flex', cellType: 'text-subtitle' },
	{ width: '80px', cellType: 'text' },
	{ width: '80px', cellType: 'text' },
	{ width: '120px', cellType: 'text' },
];
