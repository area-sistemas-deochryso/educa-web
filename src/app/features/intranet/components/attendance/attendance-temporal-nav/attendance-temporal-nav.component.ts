import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

export type TemporalNavMode = 'day' | 'month';

@Component({
	selector: 'app-attendance-temporal-nav',
	standalone: true,
	imports: [DatePipe, ButtonModule, TooltipModule],
	templateUrl: './attendance-temporal-nav.component.html',
	styleUrl: './attendance-temporal-nav.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceTemporalNavComponent {
	readonly mode = input.required<TemporalNavMode>();
	readonly currentDate = input.required<Date>();
	readonly maxDate = input<Date>(new Date());

	readonly previous = output<void>();
	readonly next = output<void>();
	readonly pickerOpen = output<void>();

	readonly label = computed(() => {
		const date = this.currentDate();
		if (this.mode() === 'day') {
			return this.formatDayLabel(date);
		}
		return this.formatMonthLabel(date);
	});

	readonly canGoNext = computed(() => {
		const current = this.currentDate();
		const max = this.maxDate();
		if (this.mode() === 'day') {
			return current < this.startOfDay(max);
		}
		return (
			current.getFullYear() < max.getFullYear() ||
			(current.getFullYear() === max.getFullYear() && current.getMonth() < max.getMonth())
		);
	});

	readonly ariaLabel = computed(() => {
		if (this.mode() === 'day') {
			return `Navegación por día. Fecha actual: ${this.label()}`;
		}
		return `Navegación por mes. Mes actual: ${this.label()}`;
	});

	onPrevious(): void {
		this.previous.emit();
	}

	onNext(): void {
		if (this.canGoNext()) {
			this.next.emit();
		}
	}

	onLabelClick(): void {
		this.pickerOpen.emit();
	}

	private formatDayLabel(date: Date): string {
		const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
		const day = days[date.getDay()];
		const dd = date.getDate().toString().padStart(2, '0');
		const mm = (date.getMonth() + 1).toString().padStart(2, '0');
		const yyyy = date.getFullYear();
		return `${day} ${dd}/${mm}/${yyyy}`;
	}

	private formatMonthLabel(date: Date): string {
		const months = [
			'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
			'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
		];
		return `${months[date.getMonth()]} ${date.getFullYear()}`;
	}

	private startOfDay(d: Date): Date {
		return new Date(d.getFullYear(), d.getMonth(), d.getDate());
	}
}
