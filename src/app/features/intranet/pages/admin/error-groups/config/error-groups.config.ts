import { SkeletonColumnDef } from '@intranet-shared/components/table-skeleton';

import { ErrorGroupEstado, ErrorOrigen, ErrorSeveridad } from '../models';

export const SEARCH_MAX = 200;

export const ESTADO_OPTIONS: { label: string; value: ErrorGroupEstado | null }[] = [
	{ label: 'Todos', value: null },
	{ label: 'Nuevo', value: 'NUEVO' },
	{ label: 'Visto', value: 'VISTO' },
	{ label: 'En progreso', value: 'EN_PROGRESO' },
	{ label: 'Resuelto', value: 'RESUELTO' },
	{ label: 'Ignorado', value: 'IGNORADO' },
];

export const SEVERIDAD_OPTIONS: { label: string; value: ErrorSeveridad | null }[] = [
	{ label: 'Todas', value: null },
	{ label: 'Critical', value: 'CRITICAL' },
	{ label: 'Error', value: 'ERROR' },
	{ label: 'Warning', value: 'WARNING' },
];

export const ORIGEN_OPTIONS: { label: string; value: ErrorOrigen | null }[] = [
	{ label: 'Todos', value: null },
	{ label: 'Frontend', value: 'FRONTEND' },
	{ label: 'Backend', value: 'BACKEND' },
	{ label: 'Red', value: 'NETWORK' },
];

export const TABLE_SKELETON_COLUMNS: SkeletonColumnDef[] = [
	{ width: '100px', cellType: 'badge' },
	{ width: '90px', cellType: 'badge' },
	{ width: 'flex', cellType: 'text-subtitle' },
	{ width: '90px', cellType: 'text' },
	{ width: '90px', cellType: 'text' },
	{ width: '120px', cellType: 'text' },
	{ width: '100px', cellType: 'actions' },
];
