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
import { EduPassThrough, EduPtRoot } from '../passthrough/edu-pt-root';
import {
	MonthCell,
	formatDate,
	formatHint,
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
export type EduDatePickerHourFormat = '12' | '24';

const PANEL_POSITIONS: ConnectedPosition[] = [
	{ originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4 },
	{ originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -4 },
];

let nextErrorId = 0;

@Component({
	selector: 'edu-datepicker',
	standalone: true,
	imports: [NgTemplateOutlet, EduPtRoot],
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
				[class.edu-datepicker--disabled]="isFormDisabled()"
					[class.edu-datepicker--invalid]="inputError() !== null"
				role="combobox"
				aria-haspopup="dialog"
				[attr.aria-expanded]="isOpen()"
				[attr.tabindex]="isInputReadonly() && !isFormDisabled() ? 0 : -1"
				[eduPtRoot]="$safeNavigationMigration(pt()?.root)"
				(click)="onWrapperClick($event)"
				(keydown)="onTriggerKeydown($event)"
			>
				<input
					class="edu-datepicker__input"
					type="text"
					[readOnly]="isInputReadonly()"
					[placeholder]="effectivePlaceholder()"
						[attr.aria-invalid]="inputError() !== null ? 'true' : null"
						[attr.aria-describedby]="inputError() !== null ? errorId : null"
					[value]="inputValue()"
					[disabled]="isFormDisabled()"
					[attr.tabindex]="isInputReadonly() || isFormDisabled() ? -1 : 0"
					(focus)="onInputFocus()"
					(input)="onInputChange($event)"
					(blur)="onInputBlur()"
					(keydown.enter)="onInputEnter($event)"
				/>
				@if (showClear() && hasValue() && !isFormDisabled()) {
					<button
						type="button"
						class="edu-datepicker__clear"
						tabindex="-1"
						aria-label="Limpiar"
						(click)="onClearClick($event)"
					>
						<i class="pi pi-times"></i>
					</button>
				}
				@if (showIcon()) {
					<button
							type="button"
							class="edu-datepicker__icon"
							tabindex="-1"
							aria-label="Abrir calendario"
							[disabled]="isFormDisabled()"
						>
							<i class="pi pi-calendar"></i>
						</button>
				}
			</div>
			@if (inputError(); as error) {
				<small class="edu-datepicker__error" role="alert" [id]="errorId">{{ error }}</small>
			}
		} @else {
			<ng-container [ngTemplateOutlet]="calendarTemplateRef() ?? null"></ng-container>
		}

		<ng-template #calendarTemplate>
			<div class="edu-datepicker-panel" [class.edu-datepicker-panel--inline]="inline()">
				@if (!timeOnly()) {
					<div class="edu-datepicker-panel__header">
						<button
							type="button"
							class="edu-datepicker-panel__nav"
							(click)="prevMonth()"
							aria-label="Mes anterior"
						>
							<i class="pi pi-chevron-left"></i>
						</button>
						<span class="edu-datepicker-panel__title">{{ monthTitle() }}</span>
						<button
							type="button"
							class="edu-datepicker-panel__nav"
							(click)="nextMonth()"
							aria-label="Mes siguiente"
						>
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
								[disabled]="isDisabled(cell.date) || isFormDisabled()"
								(click)="selectDate(cell.date)"
							>
								{{ cell.date.getDate() }}
							</button>
						}
					</div>
				}
				@if (showTime() || timeOnly()) {
					<div class="edu-datepicker-panel__time">
						@if (hourFormat() === '12') {
							<input
								class="edu-datepicker-panel__time-input"
								type="number"
								min="1"
								max="12"
								[value]="hours12()"
								(change)="onHourInput12($event)"
								aria-label="Hora"
							/>
						} @else {
							<input
								class="edu-datepicker-panel__time-input"
								type="number"
								min="0"
								max="23"
								[value]="hours()"
								(change)="onHourInput($event)"
								aria-label="Hora"
							/>
						}
						<span>:</span>
						<input
							class="edu-datepicker-panel__time-input"
							type="number"
							min="0"
							max="59"
							[value]="minutes()"
							(change)="onMinuteInput($event)"
							aria-label="Minutos"
						/>
						@if (showSeconds()) {
							<span>:</span>
							<input
								class="edu-datepicker-panel__time-input"
								type="number"
								min="0"
								max="59"
								[value]="seconds()"
								(change)="onSecondInput($event)"
								aria-label="Segundos"
							/>
						}
						@if (hourFormat() === '12') {
							<button
								type="button"
								class="edu-datepicker-panel__meridiem"
								(click)="toggleMeridiem()"
							>
								{{ meridiem() }}
							</button>
						}
					</div>
				}
				@if (showButtonBar()) {
					<div class="edu-datepicker-panel__buttonbar">
						<button
							type="button"
							class="edu-datepicker-panel__buttonbar-btn"
							(click)="goToday()"
						>
							Hoy
						</button>
						<button
							type="button"
							class="edu-datepicker-panel__buttonbar-btn"
							(click)="clearValue()"
						>
							Limpiar
						</button>
					</div>
				}
			</div>
		</ng-template>
	`,
	styleUrl: './edu-datepicker.scss',
})
export class EduDatePicker implements ControlValueAccessor, OnDestroy {
	readonly selectionMode = input<EduDatePickerSelectionMode>('single');
	readonly showIcon = input(true);
	readonly showClear = input(false);
	readonly minDate = input<Date>();
	readonly maxDate = input<Date>();
	readonly showTime = input(false);
	readonly timeOnly = input(false);
	readonly readonlyInput = input(false);
	readonly inline = input(false);
	readonly placeholder = input<string>();
	readonly disabled = input(false);
	readonly dateFormat = input('dd/mm/yy');
	readonly showButtonBar = input(false);
	readonly hourFormat = input<EduDatePickerHourFormat>('24');
	readonly showSeconds = input(false);
	/**
	 * PrimeNG's `appendTo` only decides WHERE in the DOM the overlay is appended (for stacking
	 * context / z-index escape hatches). edu-datepicker already positions its overlay via CDK
	 * `flexibleConnectedTo(trigger)`, which handles the equivalent problem structurally (the
	 * overlay is appended to the CDK overlay container by default, above any local stacking
	 * context) — so this input has no real gap to fill. Confirmed no-op, kept only so real
	 * templates that pass it still type-check.
	 */
	readonly appendTo = input<'body' | undefined>();
	readonly pt = input<EduPassThrough>();

	protected readonly weekdays = weekdayNames();

	protected readonly value = signal<Date | Date[] | null>(null);
	protected readonly viewDate = signal(new Date());
	protected readonly draftText = signal<string | null>(null);
	/** Why the typed text was not applied; shown under the field instead of emptying it. */
	protected readonly inputError = signal<string | null>(null);
	protected readonly errorId = `edu-datepicker-error-${nextErrorId++}`;

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
	protected readonly seconds = computed(() => this.selectedDates()[0]?.getSeconds() ?? 0);
	protected readonly hours12 = computed(() => {
		const h = this.hours() % 12;
		return h === 0 ? 12 : h;
	});
	protected readonly meridiem = computed(() => (this.hours() >= 12 ? 'PM' : 'AM'));

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

	protected readonly isInputReadonly = computed(
		() => this.readonlyInput() || this.selectionMode() !== 'single',
	);
	protected readonly effectivePlaceholder = computed(() => {
		const explicit = this.placeholder();
		if (explicit !== undefined) {
			return explicit;
		}
		// Only a typable single-date field has a format worth hinting.
		return this.isInputReadonly() || this.timeOnly() ? '' : formatHint(this.dateFormat());
	});
	protected readonly inputValue = computed(() => this.draftText() ?? this.displayLabel());
	protected readonly hasValue = computed(() => this.selectedDates().length > 0);

	private readonly cvaDisabled = signal(false);
	protected readonly isFormDisabled = computed(() => this.disabled() || this.cvaDisabled());

	private onChange: (value: Date | Date[] | null) => void = () => {};
	private onTouched: () => void = () => {};

	ngOnDestroy(): void {
		this.handle.close({ immediate: true });
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

	setDisabledState(isDisabled: boolean): void {
		this.cvaDisabled.set(isDisabled);
	}

	protected isOpen(): boolean {
		return this.handle.isOpen;
	}

	protected toggle(event: Event): void {
		if (this.isFormDisabled()) {
			return;
		}
		if (this.handle.isOpen) {
			this.close();
			return;
		}
		this.open(event.currentTarget as HTMLElement);
	}

	protected onWrapperClick(event: Event): void {
		const clickedTypableInput =
			!this.isInputReadonly() && (event.target as HTMLElement).tagName === 'INPUT';
		if (clickedTypableInput) {
			// Open the calendar but keep the caret in the input: a focus trap would steal
			// focus and make typing impossible. A second click never closes it.
			if (!this.isFormDisabled() && !this.handle.isOpen) {
				this.open(event.currentTarget as HTMLElement, false);
			}
			return;
		}
		this.toggle(event);
	}

	protected onClearClick(event: Event): void {
		event.preventDefault();
		event.stopPropagation();
		this.clearValue();
	}

	protected onTriggerKeydown(event: KeyboardEvent): void {
		const typingInInput =
			!this.isInputReadonly() && (event.target as HTMLElement).tagName === 'INPUT';
		if (typingInInput && event.key !== 'ArrowDown') {
			// Enter/Space belong to the text field (Enter commits the draft).
			if (event.key === 'Escape') {
				this.close();
			}
			return;
		}
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
			const next = this.isSelected(date)
				? current.filter((d) => !isSameDay(d, date))
				: [...current, date];
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
		// Keep text that failed to parse so the user can fix it instead of retyping.
		if (!this.isInputReadonly() && this.draftText() === null) {
			this.draftText.set(this.displayLabel());
		}
	}

	protected onInputChange(event: Event): void {
		this.inputError.set(null);
		this.draftText.set((event.target as HTMLInputElement).value);
	}

	protected onInputBlur(): void {
		this.commitDraft();
	}

	protected onInputEnter(event: Event): void {
		event.preventDefault();
		this.commitDraft();
		if (this.inputError() === null) {
			this.close();
		}
	}

	private commitDraft(): void {
		const draft = this.draftText();
		if (draft === null) {
			return;
		}
		if (draft.trim() === '') {
			if (this.hasValue()) {
				this.commit(null);
			}
			this.draftText.set(null);
			return;
		}
		const parsed = parseDate(draft, this.dateFormat());
		if (!parsed) {
			this.inputError.set(
				`No se entiende «${draft.trim()}». Escribe la fecha como ${formatHint(this.dateFormat())}.`,
			);
			return;
		}
		const unavailable = this.unavailableReason(parsed);
		if (unavailable) {
			this.inputError.set(unavailable);
			return;
		}
		this.viewDate.set(parsed);
		this.commit(this.showTime() ? withTime(parsed, this.selectedDates()[0] ?? new Date()) : parsed);
		this.draftText.set(null);
	}

	private unavailableReason(date: Date): string | null {
		const min = this.minDate();
		if (min && isBeforeDay(date, min)) {
			return `La fecha ${formatDate(date, this.dateFormat())} no está disponible: la primera permitida es ${formatDate(min, this.dateFormat())}.`;
		}
		const max = this.maxDate();
		if (max && isBeforeDay(max, date)) {
			return `La fecha ${formatDate(date, this.dateFormat())} no está disponible: la última permitida es ${formatDate(max, this.dateFormat())}.`;
		}
		return null;
	}

	protected onHourInput(event: Event): void {
		const hours = this.clampTimeUnit((event.target as HTMLInputElement).value, 23);
		this.commitTime(hours, this.minutes(), this.seconds());
	}

	protected onHourInput12(event: Event): void {
		const h12 = Math.min(
			Math.max(this.clampTimeUnit((event.target as HTMLInputElement).value, 12), 1),
			12,
		);
		const isPm = this.meridiem() === 'PM';
		const hours = isPm ? (h12 === 12 ? 12 : h12 + 12) : h12 === 12 ? 0 : h12;
		this.commitTime(hours, this.minutes(), this.seconds());
	}

	protected onMinuteInput(event: Event): void {
		const minutes = this.clampTimeUnit((event.target as HTMLInputElement).value, 59);
		this.commitTime(this.hours(), minutes, this.seconds());
	}

	protected onSecondInput(event: Event): void {
		const seconds = this.clampTimeUnit((event.target as HTMLInputElement).value, 59);
		this.commitTime(this.hours(), this.minutes(), seconds);
	}

	protected toggleMeridiem(): void {
		this.commitTime((this.hours() + 12) % 24, this.minutes(), this.seconds());
	}

	protected goToday(): void {
		this.selectDate(new Date());
	}

	protected clearValue(): void {
		this.commit(null);
	}

	private clampTimeUnit(rawValue: string, max: number): number {
		const parsed = Number(rawValue);
		if (Number.isNaN(parsed)) {
			return 0;
		}
		return Math.min(Math.max(parsed, 0), max);
	}

	private commitTime(hours: number, minutes: number, seconds: number): void {
		const base = this.selectedDates()[0] ?? new Date();
		const next = new Date(base);
		next.setHours(hours, minutes, seconds, 0);
		this.commit(next);
	}

	private formatOne(date: Date): string {
		if (this.timeOnly()) {
			return formatTime(date);
		}
		return this.showTime()
			? `${formatDate(date, this.dateFormat())} ${formatTime(date)}`
			: formatDate(date, this.dateFormat());
	}

	private commit(value: Date | Date[] | null): void {
		this.inputError.set(null);
		this.draftText.set(null);
		this.value.set(value);
		this.onChange(value);
		this.onTouched();
	}

	private close(): void {
		this.handle.close();
	}

	private open(trigger: HTMLElement, trapFocus = true): void {
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
				trapFocus,
			},
			() => this.close(),
		);
	}
}
