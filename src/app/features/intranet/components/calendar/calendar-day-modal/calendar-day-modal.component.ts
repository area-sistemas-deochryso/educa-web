// #region Imports
import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalData } from '@features/intranet/pages/calendary-component/calendar.types';

// #endregion
// #region Implementation
@Component({
	selector: 'app-calendar-day-modal',
	imports: [CommonModule],
	templateUrl: './calendar-day-modal.component.html',
	styleUrl: './calendar-day-modal.component.scss',
})
export class CalendarDayModalComponent {
	// * Inputs control visibility and content.
	visible = input.required<boolean>();
	data = input.required<ModalData | null>();

	// * Close output for parent control.
	closeModal = output<void>();

	onClose(): void {
		this.closeModal.emit();
	}

	onOverlayClick(event: MouseEvent): void {
		// * Only close when clicking the overlay, not the content.
		if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
			this.onClose();
		}
	}

	formatDate(date: Date): string {
		// * Locale-friendly date for modal header.
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
			special: 'DÃƒÆ’Ã‚Â­a Especial',
		};
		return labels[type] || type;
	}

	getEventTypeLabel(type: string): string {
		const labels: Record<string, string> = {
			academic: 'Evento AcadÃƒÆ’Ã‚Â©mico',
			cultural: 'Evento Cultural',
			sports: 'Evento Deportivo',
			meeting: 'ReuniÃƒÆ’Ã‚Â³n',
			other: 'Otro',
		};
		return labels[type] || type;
	}
}
// #endregion
