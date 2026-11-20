// #region Imports
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EduDialog } from '@edu-ui';
import { ModalData } from '@features/intranet/pages/cross-role/calendary-component/calendar.types';

// #endregion
// #region Implementation
@Component({
	selector: 'app-calendar-day-modal',
	imports: [CommonModule, EduDialog],
	templateUrl: './calendar-day-modal.component.html',
	styleUrl: './calendar-day-modal.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarDayModalComponent {
	// * Inputs control visibility and content.
	visible = input.required<boolean>();
	data = input.required<ModalData | null>();

	// * Close output for parent control.
	closeModal = output<void>();

	// * Accent color by type, applied to the dialog panel.
	readonly dialogStyle = computed<Record<string, string>>(() => {
		const accent = this.data()?.type === 'holiday' ? 'var(--red-600)' : 'var(--green-600)';
		return { width: '480px', 'border-top': `4px solid ${accent}` };
	});

	readonly modalTitle = computed(() => {
		const modalData = this.data();
		if (!modalData) return '';
		return (modalData.type === 'holiday' ? modalData.holiday?.name : modalData.event?.title) ?? '';
	});

	onVisibleChange(visible: boolean): void {
		// * Esc, backdrop click and the X all arrive here; the parent owns the state.
		if (!visible) {
			this.closeModal.emit();
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
// #endregion
