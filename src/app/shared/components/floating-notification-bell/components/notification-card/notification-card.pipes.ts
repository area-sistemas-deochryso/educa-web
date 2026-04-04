import { Pipe, PipeTransform } from '@angular/core';

const TYPE_LABELS: Record<string, string> = {
	matricula: 'Matrícula',
	pago: 'Pago',
	academico: 'Académico',
	festividad: 'Festividad',
	evento: 'Evento',
	smart: 'Smart',
};

const TYPE_ICONS: Record<string, string> = {
	matricula: 'pi-user-plus',
	pago: 'pi-wallet',
	academico: 'pi-chart-bar',
	festividad: 'pi-star',
	evento: 'pi-calendar',
	smart: 'pi-bolt',
};

const PRIORITY_LABELS: Record<string, string> = {
	urgent: 'Urgente',
	high: 'Importante',
	medium: 'Normal',
	low: 'Info',
};

@Pipe({ name: 'notifTypeLabel', standalone: true, pure: true })
export class NotifTypeLabelPipe implements PipeTransform {
	transform(type: string): string {
		return TYPE_LABELS[type] || type;
	}
}

@Pipe({ name: 'notifPriorityLabel', standalone: true, pure: true })
export class NotifPriorityLabelPipe implements PipeTransform {
	transform(priority: string): string {
		return PRIORITY_LABELS[priority] || priority;
	}
}

@Pipe({ name: 'notifTypeIcon', standalone: true, pure: true })
export class NotifTypeIconPipe implements PipeTransform {
	transform(type: string): string {
		return TYPE_ICONS[type] || 'pi-bell';
	}
}
