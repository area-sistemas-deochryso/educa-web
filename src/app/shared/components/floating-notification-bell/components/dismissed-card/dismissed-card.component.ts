// #region Imports
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SeasonalNotification } from '@core/services';

// #endregion
// #region Implementation
@Component({
	selector: 'app-dismissed-card',
	imports: [CommonModule],
	templateUrl: './dismissed-card.component.html',
	styleUrl: './dismissed-card.component.scss',
})
export class DismissedCardComponent {
	// * Dismissed notification snapshot to render.
	@Input({ required: true }) notification!: SeasonalNotification;

	// * Restore event bubbles up to the panel.
	@Output() restore = new EventEmitter<string>();

	get priorityClass(): string {
		return `notification-${this.notification.priority}`;
	}

	getTypeIcon(type: string): string {
		// * Map backend types to Prime icons.
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
		// * Map backend types to display labels.
		const labels: Record<string, string> = {
			matricula: 'MatrÃƒÂ­cula',
			pago: 'Pago',
			academico: 'AcadÃƒÂ©mico',
			festividad: 'Festividad',
			evento: 'Evento',
		};
		return labels[type] || type;
	}

	onRestore(): void {
		// * Emit restore action for this notification.
		this.restore.emit(this.notification.id);
	}
}
// #endregion
