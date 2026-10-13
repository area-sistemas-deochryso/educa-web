// #region Imports
import {
	afterNextRender,
	ChangeDetectionStrategy,
	Component,
	computed,
	ElementRef,
	inject,
	Injector,
	input,
	output,
	signal,
} from '@angular/core';

import {
	addDays,
	ATTENDANCE_CALENDAR_STATES,
	ATTENDANCE_STATE_ICONS,
	ATTENDANCE_STATE_LABELS,
	AttendanceCalendarDay,
	AttendanceCalendarRecord,
	AttendanceCalendarState,
	buildMonthWeeks,
	CalendarMonthRef,
	daysInMonth,
	describeCell,
	formatMonthKey,
	indexRecords,
	latestRecordMonth,
	MONTH_NAMES,
	monthFromIndex,
	monthIndex,
	parseMonthKey,
	weekdayIndex,
	WEEKDAYS,
} from './attendance-calendar.helpers';
// #endregion

// #region Types
interface CalendarCell {
	readonly day: number;
	readonly label: string;
	readonly estado: AttendanceCalendarState | null;
	readonly icon: string | null;
	readonly esRecuperacion: boolean;
	readonly focusable: boolean;
}

interface LegendItem {
	readonly estado: AttendanceCalendarState;
	readonly label: string;
	readonly icon: string;
}
// #endregion

// #region Implementation
/**
 * Calendario mensual de asistencia (P110-F25a, decisión P5-B). Presentacional: recibe los
 * días con su estado y los dibuja; no conoce endpoints, stores ni franjas horarias.
 *
 * - **Mes visible**: estado interno. Parte de `initialMonth` (`YYYY-MM`), si no del mes del
 *   registro más reciente, si no del mes actual. Las flechas y `PageUp/PageDown` lo cambian;
 *   `minMonth`/`maxMonth` (opcionales) acotan la navegación. Cada cambio emite `monthChange`.
 * - **Sin color como único canal** (a11y): cada estado lleva ícono distinto y `aria-label`; la
 *   recuperación lleva insignia «R» y borde punteado.
 * - **`INV-AC11`**: un día sin registro se dibuja neutro, nunca como falta. Mes sin registros
 *   → «Sin registros».
 * - **Fechas**: se ubican por el prefijo `YYYY-MM-DD`, sin `new Date(texto)`.
 * - **Teclado**: cuadrícula con un solo tab stop (roving tabindex); flechas, Home/End (fila),
 *   PageUp/PageDown (mes). Las flechas cruzan de mes cuando la navegación lo permite.
 *
 * Pendiente de conectar: lo monta F25b (brief 819).
 */
@Component({
	selector: 'app-attendance-calendar',
	standalone: true,
	templateUrl: './attendance-calendar.component.html',
	styleUrl: './attendance-calendar.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceCalendarComponent {
	private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
	private readonly injector = inject(Injector);

	// #region Inputs / outputs
	readonly days = input<readonly AttendanceCalendarDay[]>([]);
	readonly initialMonth = input<string | null>(null);
	readonly minMonth = input<string | null>(null);
	readonly maxMonth = input<string | null>(null);
	readonly monthChange = output<string>();
	// #endregion

	// #region Constants for the template
	readonly weekdays = WEEKDAYS;
	readonly legendItems: readonly LegendItem[] = ATTENDANCE_CALENDAR_STATES.map((estado) => ({
		estado,
		label: ATTENDANCE_STATE_LABELS[estado],
		icon: ATTENDANCE_STATE_ICONS[estado],
	}));
	// #endregion

	// #region State
	private readonly selectedMonth = signal<CalendarMonthRef | null>(null);
	private readonly activeDay = signal<number | null>(null);

	private readonly records = computed(() => indexRecords(this.days()));

	readonly visibleMonth = computed<CalendarMonthRef>(() => {
		const selected = this.selectedMonth();
		if (selected) return selected;
		const initial = parseMonthKey(this.initialMonth());
		if (initial) return initial;
		const latest = latestRecordMonth(this.records());
		if (latest) return latest;
		const now = new Date();
		return { year: now.getFullYear(), month: now.getMonth() + 1 };
	});

	readonly monthTitle = computed(() => {
		const { year, month } = this.visibleMonth();
		return `${MONTH_NAMES[month - 1]} de ${year}`;
	});

	private readonly monthLength = computed(() => daysInMonth(this.visibleMonth().year, this.visibleMonth().month));

	private readonly focusableDay = computed(() => Math.min(Math.max(this.activeDay() ?? 1, 1), this.monthLength()));

	readonly weeks = computed<(CalendarCell | null)[][]>(() => {
		const { year, month } = this.visibleMonth();
		const records = this.records();
		const focusable = this.focusableDay();
		return buildMonthWeeks(year, month).map((week) =>
			week.map((day) => {
				if (day === null) return null;
				const key = `${formatMonthKey({ year, month })}-${String(day).padStart(2, '0')}`;
				const record: AttendanceCalendarRecord | undefined = records.get(key);
				return {
					day,
					label: describeCell(year, month, day, record),
					estado: record?.estado ?? null,
					icon: record ? ATTENDANCE_STATE_ICONS[record.estado] : null,
					esRecuperacion: record?.esRecuperacion ?? false,
					focusable: day === focusable,
				};
			}),
		);
	});

	readonly hasRecords = computed(() => this.weeks().some((week) => week.some((cell) => cell?.estado)));

	readonly canGoPrevious = computed(() => this.isMonthAllowed(monthIndex(this.visibleMonth()) - 1));
	readonly canGoNext = computed(() => this.isMonthAllowed(monthIndex(this.visibleMonth()) + 1));
	// #endregion

	// #region Navigation
	goToPreviousMonth(): void {
		this.goToMonthIndex(monthIndex(this.visibleMonth()) - 1);
	}

	goToNextMonth(): void {
		this.goToMonthIndex(monthIndex(this.visibleMonth()) + 1);
	}

	onKeydown(event: KeyboardEvent): void {
		const { year, month } = this.visibleMonth();
		const day = this.focusableDay();
		switch (event.key) {
			case 'ArrowLeft':
				return this.handleMove(event, day, -1);
			case 'ArrowRight':
				return this.handleMove(event, day, 1);
			case 'ArrowUp':
				return this.handleMove(event, day, -7);
			case 'ArrowDown':
				return this.handleMove(event, day, 7);
			case 'Home':
				return this.handleRowEdge(event, day, -weekdayIndex(year, month, day));
			case 'End':
				return this.handleRowEdge(event, day, 6 - weekdayIndex(year, month, day));
			case 'PageUp':
				return this.handleMonthJump(event, day, -1);
			case 'PageDown':
				return this.handleMonthJump(event, day, 1);
		}
	}

	onCellFocus(day: number): void {
		this.activeDay.set(day);
	}

	private handleMove(event: KeyboardEvent, day: number, offset: number): void {
		event.preventDefault();
		const target = addDays(this.visibleMonth(), day, offset);
		const targetIndex = monthIndex(target);
		if (targetIndex !== monthIndex(this.visibleMonth()) && !this.isMonthAllowed(targetIndex)) return;
		this.moveTo(targetIndex, target.day);
	}

	private handleRowEdge(event: KeyboardEvent, day: number, offset: number): void {
		event.preventDefault();
		const target = Math.min(Math.max(day + offset, 1), this.monthLength());
		this.moveTo(monthIndex(this.visibleMonth()), target);
	}

	private handleMonthJump(event: KeyboardEvent, day: number, direction: 1 | -1): void {
		event.preventDefault();
		const targetIndex = monthIndex(this.visibleMonth()) + direction;
		if (!this.isMonthAllowed(targetIndex)) return;
		this.moveTo(targetIndex, day);
	}

	private moveTo(targetIndex: number, day: number): void {
		this.setMonthIndex(targetIndex);
		const target = monthFromIndex(targetIndex);
		const clamped = Math.min(day, daysInMonth(target.year, target.month));
		this.activeDay.set(clamped);
		afterNextRender(
			() => this.host.nativeElement.querySelector<HTMLElement>(`[data-day="${clamped}"]`)?.focus(),
			{ injector: this.injector },
		);
	}

	private goToMonthIndex(targetIndex: number): void {
		if (!this.isMonthAllowed(targetIndex)) return;
		this.setMonthIndex(targetIndex);
	}

	private setMonthIndex(targetIndex: number): void {
		if (targetIndex === monthIndex(this.visibleMonth())) return;
		const target = monthFromIndex(targetIndex);
		this.selectedMonth.set(target);
		this.monthChange.emit(formatMonthKey(target));
	}

	private isMonthAllowed(targetIndex: number): boolean {
		const min = parseMonthKey(this.minMonth());
		const max = parseMonthKey(this.maxMonth());
		return (!min || targetIndex >= monthIndex(min)) && (!max || targetIndex <= monthIndex(max));
	}
	// #endregion
}
// #endregion
