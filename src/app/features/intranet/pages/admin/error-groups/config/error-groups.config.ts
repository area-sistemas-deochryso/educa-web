import { SkeletonColumnDef } from '@intranet-shared/components/table-skeleton';

import {
	ESTADO_LABEL_MAP,
	ESTADO_SEVERITY_MAP,
	ErrorGroupEstado,
	ErrorOrigen,
	ErrorSeveridad,
	ORIGEN_ICON_MAP,
	SEVERIDAD_SEVERITY_MAP,
} from '../models';

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
	{ width: '80px', cellType: 'text' },
	{ width: '90px', cellType: 'text' },
	{ width: '120px', cellType: 'text' },
	{ width: '100px', cellType: 'actions' },
];

export function getSeveridadSeverity(severidad: string): 'danger' | 'warn' | 'info' {
	return SEVERIDAD_SEVERITY_MAP[severidad as ErrorSeveridad] ?? 'info';
}

export function getEstadoLabel(estado: string): string {
	return ESTADO_LABEL_MAP[estado as ErrorGroupEstado] ?? estado;
}

export function getEstadoSeverity(estado: string): 'danger' | 'warn' | 'info' | 'success' | 'secondary' {
	return ESTADO_SEVERITY_MAP[estado as ErrorGroupEstado] ?? 'secondary';
}

export function getOrigenIcon(origen: string): string {
	return ORIGEN_ICON_MAP[origen as ErrorOrigen] ?? 'pi pi-question';
}
