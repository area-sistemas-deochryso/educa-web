import { QueryParams } from '@data/repositories/base/base.repository';

export interface Notification {
	id: number;
	titulo: string;
	mensaje: string;
	tipo: 'info' | 'warning' | 'error' | 'success';
	prioridad: 'low' | 'medium' | 'high' | 'urgent';
	leida: boolean;
	fechaCreacion: string;
	fechaExpiracion?: string;
	usuarioId?: number;
	actionUrl?: string;
}

export interface CreateNotificationDto {
	titulo: string;
	mensaje: string;
	tipo: Notification['tipo'];
	prioridad: Notification['prioridad'];
	fechaExpiracion?: string;
	usuarioId?: number;
	actionUrl?: string;
}

export interface NotificationQueryParams extends QueryParams {
	leida?: boolean;
	tipo?: Notification['tipo'];
	prioridad?: Notification['prioridad'];
}
