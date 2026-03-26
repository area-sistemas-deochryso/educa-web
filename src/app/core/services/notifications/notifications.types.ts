/**
 * Type definitions for the seasonal notification system.
 */

// #region Notification types

export type NotificationType = 'matricula' | 'pago' | 'academico' | 'festividad' | 'evento' | 'smart';
export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface SeasonalNotification {
	/** Unique identifier. */
	id: string;
	/** Notification type. */
	type: NotificationType;
	/** Title text. */
	title: string;
	/** Message or description. */
	message: string;
	/** Icon class (PrimeIcons). */
	icon: string;
	/** Priority level. */
	priority: NotificationPriority;
	/** Function that decides if it should show today. */
	shouldShow: (date: Date) => boolean;
	/** Action URL (optional). */
	actionUrl?: string;
	/** Action button text (optional). */
	actionText?: string;
	/** Whether it can be dismissed. */
	dismissible?: boolean;
}

// #endregion
