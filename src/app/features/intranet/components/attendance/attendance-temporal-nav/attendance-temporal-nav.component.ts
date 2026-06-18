import {
	ChangeDetectionStrategy,
	Component,
	computed,
	ElementRef,
	HostListener,
	inject,
	input,
	output,
	signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { TooltipModule } from 'primeng/tooltip';

export type TemporalNavMode = 'day' | 'month';

@Component({
	selector: 'app-attendance-temporal-nav',
	standalone: true,
	imports: [FormsModule, ButtonModule, DatePickerModule, TooltipModule],
	templateUrl: './attendance-temporal-nav.component.html',
	styleUrl: './attendance-temporal-nav.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceTemporalNavComponent {
	private readonly elRef = inject(ElementRef);

	readonly mode = input.required<TemporalNavMode>();
	readonly currentDate = input.required<Date>();
	readonly maxDate = input<Date>(new Date());

	readonly previous = output<void>();
	readonly next = output<void>();
	readonly dateSelect = output<Date>();
	readonly pickerOpen = output<void>();

	readonly pickerVisible = signal(false);

	@HostListener('document:click', ['$event'])
	onDocumentClick(event: Event): void {
		if (this.pickerVisible() && !this.elRef.nativeElement.contains(event.target)) {
			this.pickerVisible.set(false);
		}
	}

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

	togglePicker(event: Event): void {
		event.stopPropagation();
		if (this.mode() === 'month') {
			this.pickerOpen.emit();
			return;
		}
		this.pickerVisible.update((v) => !v);
	}

	onDateSelect(date: Date | null): void {
		if (date) {
			this.pickerVisible.set(false);
			this.dateSelect.emit(date);
		}
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
