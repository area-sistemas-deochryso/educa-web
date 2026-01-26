import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalData } from '../../../pages/calendary-component/calendar.types';

@Component({
	selector: 'app-calendar-day-modal',
	imports: [CommonModule],
	templateUrl: './calendar-day-modal.component.html',
	styleUrl: './calendar-day-modal.component.scss',
})
export class CalendarDayModalComponent {
	visible = input.required<boolean>();
	data = input.required<ModalData | null>();

	closeModal = output<void>();

	onClose(): void {
		this.closeModal.emit();
	}

	onOverlayClick(event: MouseEvent): void {
		if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
			this.onClose();
		}
	}

	formatDate(date: Date): string {
		return date.toLocaleDateString('es-PE', {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		});
	}

	getHolidayTypeLabel(type: string): string {
		const labels: Record<string, string> = {
			national: 'Feriado Nacional',
			regional: 'Feriado Regional',
			special: 'Día Especial',
		};
		return labels[type] || type;
	}

	getEventTypeLabel(type: string): string {
		const labels: Record<string, string> = {
			academic: 'Evento Académico',
			cultural: 'Evento Cultural',
			sports: 'Evento Deportivo',
			meeting: 'Reunión',
			other: 'Otro',
		};
		return labels[type] || type;
	}
}
