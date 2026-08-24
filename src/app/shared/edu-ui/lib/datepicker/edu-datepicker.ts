import { NgTemplateOutlet } from '@angular/common';
import { FocusTrapFactory } from '@angular/cdk/a11y';
import { ConnectedPosition, Overlay } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import {
	ChangeDetectionStrategy,
	Component,
	OnDestroy,
	TemplateRef,
	ViewContainerRef,
	computed,
	forwardRef,
	inject,
	input,
	signal,
	viewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { EduOverlayHandle } from '../overlay/edu-overlay-handle';
import {
	MonthCell,
	formatDate,
	formatTime,
	generateMonthGrid,
	isBeforeDay,
	isBetween,
	isDateDisabled,
	isSameDay,
	monthTitle as monthTitleFor,
	parseDate,
	weekdayNames,
	withTime,
} from './date-picker-utils';

export type EduDatePickerSelectionMode = 'single' | 'range' | 'multiple';

const PANEL_POSITIONS: ConnectedPosition[] = [
	{ originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4 },
	{ originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -4 },
];

@Component({
	selector: 'edu-datepicker',
	standalone: true,
	imports: [NgTemplateOutlet],
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [
		{
			provide: NG_VALUE_ACCESSOR,
			useExisting: forwardRef(() => EduDatePicker),
			multi: true,
		},
	],
	template: `
		@if (!inline()) {
			<div
				class="edu-datepicker"
				[class.edu-datepicker--disabled]="disabled()"
				role="combobox"
				aria-haspopup="dialog"
				[attr.aria-expanded]="isOpen()"
				[attr.tabindex]="isInputReadonly() && !disabled() ? 0 : -1"
				(click)="onWrapperClick($event)"
				(keydown)="onTriggerKeydown($event)"
			>
				<input
					class="edu-datepicker__input"
					type="text"
					[readOnly]="isInputReadonly()"
					[placeholder]="placeholder() ?? ''"
					[value]="inputValue()"
					[disabled]="disabled()"
					[attr.tabindex]="isInputReadonly() || disabled() ? -1 : 0"
					(focus)="onInputFocus()"
					(input)="onInputChange($event)"
					(blur)="onInputBlur()"
					(keydown.enter)="onInputEnter($event)"
				/>
				@if (showIcon()) {
					<i class="edu-datepicker__icon pi pi-calendar"></i>
				}
			</div>
		} @else {
			<ng-container [ngTemplateOutlet]="calendarTemplateRef() ?? null"></ng-container>
		}

		<ng-template #calendarTemplate>
			<div class="edu-datepicker-panel" [class.edu-datepicker-panel--inline]="inline()">
				@if (!timeOnly()) {
					<div class="edu-datepicker-panel__header">
						<button type="button" class="edu-datepicker-panel__nav" (click)="prevMonth()" aria-label="Mes anterior">
							<i class="pi pi-chevron-left"></i>
						</button>
						<span class="edu-datepicker-panel__title">{{ monthTitle() }}</span>
						<button type="button" class="edu-datepicker-panel__nav" (click)="nextMonth()" aria-label="Mes siguiente">
							<i class="pi pi-chevron-right"></i>
						</button>
					</div>
					<div class="edu-datepicker-panel__weekdays">
						@for (day of weekdays; track day) {
							<span>{{ day }}</span>
						}
					</div>
					<div class="edu-datepicker-panel__days">
						@for (cell of monthCells(); track cell.date.getTime()) {
							<button
								type="button"
								class="edu-datepicker-panel__day"
								[class.edu-datepicker-panel__day--other-month]="!cell.currentMonth"
								[class.edu-datepicker-panel__day--selected]="isSelected(cell.date)"
								[class.edu-datepicker-panel__day--in-range]="isInRange(cell.date)"
								[class.edu-datepicker-panel__day--today]="isToday(cell.date)"
								[disabled]="isDisabled(cell.date)"
								(click)="selectDate(cell.date)"
							>
								{{ cell.date.getDate() }}
							</button>
						}
					</div>
				}
				@if (showTime() || timeOnly()) {
					<div class="edu-datepicker-panel__time">
						<input class="edu-datepicker-panel__time-input" type="number" min="0" max="23" [value]="hours()" (change)="onHourInput($event)" aria-label="Hora" />
						<span>:</span>
						<input class="edu-datepicker-panel__time-input" type="number" min="0" max="59" [value]="minutes()" (change)="onMinuteInput($event)" aria-label="Minutos" />
					</div>
				}
			</div>
		</ng-template>
	`,
	styleUrl: './edu-datepicker.scss',
})
export class EduDatePicker implements ControlValueAccessor, OnDestroy {
	readonly selectionMode = input<EduDatePickerSelectionMode>('single');
	readonly showIcon = input(false);
	readonly minDate = input<Date>();
	readonly maxDate = input<Date>();
	readonly showTime = input(false);
	readonly timeOnly = input(false);
	readonly readonlyInput = input(false);
	readonly inline = input(false);
	readonly placeholder = input<string>();
	readonly disabled = input(false);
	readonly dateFormat = input('dd/mm/yy');

	protected readonly weekdays = weekdayNames();

	protected readonly value = signal<Date | Date[] | null>(null);
	protected readonly viewDate = signal(new Date());
	protected readonly draftText = signal<string | null>(null);

	protected readonly calendarTemplateRef = viewChild<TemplateRef<unknown>>('calendarTemplate');
	private readonly viewContainerRef = inject(ViewContainerRef);
	private readonly overlay = inject(Overlay);
	private readonly focusTrapFactory = inject(FocusTrapFactory);
	private readonly handle = new EduOverlayHandle(this.overlay, this.focusTrapFactory);

	protected readonly monthCells = computed<MonthCell[]>(() => generateMonthGrid(this.viewDate()));
	protected readonly monthTitle = computed(() => monthTitleFor(this.viewDate()));

	protected readonly selectedDates = computed<Date[]>(() => {
		const v = this.value();
		if (!v) {
			return [];
		}
		return Array.isArray(v) ? v : [v];
	});

	protected readonly hours = computed(() => this.selectedDates()[0]?.getHours() ?? 0);
	protected readonly minutes = computed(() => this.selectedDates()[0]?.getMinutes() ?? 0);

	protected readonly displayLabel = computed(() => {
		const mode = this.selectionMode();
		const dates = this.selectedDates();
		if (dates.length === 0) {
			return '';
		}
		const fmt = (date: Date) => this.formatOne(date);
		if (mode === 'range') {
			const [start, end] = dates;
			return end ? `${fmt(start)} - ${fmt(end)}` : `${fmt(start)} - `;
		}
		if (mode === 'multiple') {
			return dates.map(fmt).join(', ');
		}
		return fmt(dates[0]);
	});

	protected readonly isInputReadonly = computed(() => this.readonlyInput() || this.selectionMode() !== 'single');
	protected readonly inputValue = computed(() => this.draftText() ?? this.displayLabel());

	private onChange: (value: Date | Date[] | null) => void = () => {};
	private onTouched: () => void = () => {};

	ngOnDestroy(): void {
		this.handle.close();
	}

	writeValue(value: Date | Date[] | null): void {
		this.value.set(value ?? null);
		const first = Array.isArray(value) ? value[0] : value;
		this.viewDate.set(first ?? new Date());
	}

	registerOnChange(fn: (value: Date | Date[] | null) => void): void {
		this.onChange = fn;
	}

	registerOnTouched(fn: () => void): void {
		this.onTouched = fn;
	}

	protected isOpen(): boolean {
		return this.handle.isOpen;
	}

	protected toggle(event: Event): void {
		if (this.disabled()) {
			return;
		}
		if (this.handle.isOpen) {
			this.close();
			return;
		}
		this.open(event.currentTarget as HTMLElement);
	}

	protected onWrapperClick(event: Event): void {
		const clickedTypableInput = !this.isInputReadonly() && (event.target as HTMLElement).tagName === 'INPUT';
		if (clickedTypableInput) {
			// Let the click focus the input for typing instead of opening the overlay,
			// which would immediately steal focus back via FocusTrap.
			return;
		}
		this.toggle(event);
	}

	protected onTriggerKeydown(event: KeyboardEvent): void {
		if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			if (!this.handle.isOpen) {
				this.open(event.currentTarget as HTMLElement);
			}
		} else if (event.key === 'Escape') {
			this.close();
		}
	}

	protected prevMonth(): void {
		const d = this.viewDate();
		this.viewDate.set(new Date(d.getFullYear(), d.getMonth() - 1, 1));
	}

	protected nextMonth(): void {
		const d = this.viewDate();
		this.viewDate.set(new Date(d.getFullYear(), d.getMonth() + 1, 1));
	}

	protected isSelected(date: Date): boolean {
		return this.selectedDates().some((d) => isSameDay(d, date));
	}

	protected isInRange(date: Date): boolean {
		if (this.selectionMode() !== 'range') {
			return false;
		}
		const [start, end] = this.selectedDates();
		if (!start || !end) {
			return false;
		}
		return isBetween(date, start, end);
	}

	protected isToday(date: Date): boolean {
		return isSameDay(date, new Date());
	}

	protected isDisabled(date: Date): boolean {
		return isDateDisabled(date, this.minDate(), this.maxDate());
	}

	protected selectDate(date: Date): void {
		if (this.isDisabled(date)) {
			return;
		}

		const mode = this.selectionMode();

		if (mode === 'multiple') {
			const current = this.selectedDates();
			const next = this.isSelected(date) ? current.filter((d) => !isSameDay(d, date)) : [...current, date];
			this.commit(next);
			return;
		}

		if (mode === 'range') {
			const [start, end] = this.selectedDates();
			if (!start || end) {
				this.commit([date]);
				return;
			}
			const next = isBeforeDay(date, start) ? [date, start] : [start, date];
			this.commit(next);
			this.close();
			return;
		}

		const next = this.showTime() ? withTime(date, this.selectedDates()[0] ?? new Date()) : date;
		this.commit(next);
		this.close();
	}

	protected onInputFocus(): void {
		if (!this.isInputReadonly()) {
			this.draftText.set(this.displayLabel());
		}
	}

	protected onInputChange(event: Event): void {
		this.draftText.set((event.target as HTMLInputElement).value);
	}

	protected onInputBlur(): void {
		this.commitDraft();
	}

	protected onInputEnter(event: Event): void {
		event.preventDefault();
		this.commitDraft();
	}

	private commitDraft(): void {
		const draft = this.draftText();
		if (draft === null) {
			return;
		}
		const parsed = parseDate(draft, this.dateFormat());
		if (parsed && !this.isDisabled(parsed)) {
			this.commit(this.showTime() ? withTime(parsed, this.selectedDates()[0] ?? new Date()) : parsed);
		}
		this.draftText.set(null);
	}

	protected onHourInput(event: Event): void {
		const hours = this.clampTimeUnit((event.target as HTMLInputElement).value, 23);
		this.commitTime(hours, this.minutes());
	}

	protected onMinuteInput(event: Event): void {
		const minutes = this.clampTimeUnit((event.target as HTMLInputElement).value, 59);
		this.commitTime(this.hours(), minutes);
	}

	private clampTimeUnit(rawValue: string, max: number): number {
		const parsed = Number(rawValue);
		if (Number.isNaN(parsed)) {
			return 0;
		}
		return Math.min(Math.max(parsed, 0), max);
	}

	private commitTime(hours: number, minutes: number): void {
		const base = this.selectedDates()[0] ?? new Date();
		const next = new Date(base);
		next.setHours(hours, minutes, 0, 0);
		this.commit(next);
	}

	private formatOne(date: Date): string {
		if (this.timeOnly()) {
			return formatTime(date);
		}
		return this.showTime() ? `${formatDate(date, this.dateFormat())} ${formatTime(date)}` : formatDate(date, this.dateFormat());
	}

	private commit(value: Date | Date[] | null): void {
		this.value.set(value);
		this.onChange(value);
		this.onTouched();
	}

	private close(): void {
		this.handle.close();
	}

	private open(trigger: HTMLElement): void {
		const template = this.calendarTemplateRef();
		if (!template) {
			return;
		}

		const portal = new TemplatePortal(template, this.viewContainerRef);
		const positionStrategy = this.overlay
			.position()
			.flexibleConnectedTo(trigger)
			.withPositions(PANEL_POSITIONS)
			.withFlexibleDimensions(false)
			.withPush(true);

		this.handle.open(
			portal,
			{
				positionStrategy,
				panelClass: 'edu-datepicker-pane',
				hasBackdrop: true,
				backdropClass: 'cdk-overlay-transparent-backdrop',
				closeOnBackdropClick: true,
			},
			() => this.close(),
		);
	}
}
