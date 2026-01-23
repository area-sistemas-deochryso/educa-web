import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SeasonalNotification } from '@core/services';

@Component({
	selector: 'app-dismissed-card',
	imports: [CommonModule],
	templateUrl: './dismissed-card.component.html',
	styleUrl: './dismissed-card.component.scss',
})
export class DismissedCardComponent {
	@Input({ required: true }) notification!: SeasonalNotification;

	@Output() restore = new EventEmitter<string>();

	get priorityClass(): string {
		return `notification-${this.notification.priority}`;
	}

	getTypeIcon(type: string): string {
		const icons: Record<string, string> = {
			matricula: 'pi-user-plus',
			pago: 'pi-wallet',
			academico: 'pi-chart-bar',
			festividad: 'pi-star',
			evento: 'pi-calendar',
		};
		return icons[type] || 'pi-bell';
	}

	getTypeLabel(type: string): string {
		const labels: Record<string, string> = {
			matricula: 'Matrícula',
			pago: 'Pago',
			academico: 'Académico',
			festividad: 'Festividad',
			evento: 'Evento',
		};
		return labels[type] || type;
	}

	onRestore(): void {
		this.restore.emit(this.notification.id);
	}
}
