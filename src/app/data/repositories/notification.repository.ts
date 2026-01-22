import { Injectable } from '@angular/core'
import { Observable, catchError, of, map } from 'rxjs'
import { BaseRepository, QueryParams } from './base.repository'
import { logger } from '@core/helpers'

export interface Notification {
	id: number
	titulo: string
	mensaje: string
	tipo: 'info' | 'warning' | 'error' | 'success'
	prioridad: 'low' | 'medium' | 'high' | 'urgent'
	leida: boolean
	fechaCreacion: string
	fechaExpiracion?: string
	usuarioId?: number
	actionUrl?: string
}

export interface CreateNotificationDto {
	titulo: string
	mensaje: string
	tipo: Notification['tipo']
	prioridad: Notification['prioridad']
	fechaExpiracion?: string
	usuarioId?: number
	actionUrl?: string
}

export interface NotificationQueryParams extends QueryParams {
	leida?: boolean
	tipo?: Notification['tipo']
	prioridad?: Notification['prioridad']
}

@Injectable({
	providedIn: 'root',
})
export class NotificationRepository extends BaseRepository<Notification, CreateNotificationDto> {
	protected endpoint = '/api/Notifications'
	protected entityName = 'Notification'

	/**
	 * Obtener notificaciones no leidas
	 */
	getUnread(): Observable<Notification[]> {
		return this.getAll({ leida: false } as NotificationQueryParams)
	}

	/**
	 * Marcar como leida
	 */
	markAsRead(notificationId: number): Observable<Notification | null> {
		return this.patch(notificationId, { leida: true } as Partial<CreateNotificationDto>)
	}

	/**
	 * Marcar todas como leidas
	 */
	markAllAsRead(): Observable<boolean> {
		return this.httpService['post']<void>(`${this.endpoint}/mark-all-read`, {}).pipe(
			map(() => true),
			catchError(error => {
				logger.error('[NotificationRepository] markAllAsRead error:', error)
				return of(false)
			})
		)
	}

	/**
	 * Obtener por tipo
	 */
	getByType(tipo: Notification['tipo']): Observable<Notification[]> {
		return this.getAll({ tipo } as NotificationQueryParams)
	}

	/**
	 * Obtener por prioridad
	 */
	getByPriority(prioridad: Notification['prioridad']): Observable<Notification[]> {
		return this.getAll({ prioridad } as NotificationQueryParams)
	}
}
