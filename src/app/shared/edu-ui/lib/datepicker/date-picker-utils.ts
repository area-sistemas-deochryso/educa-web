export interface MonthCell {
	date: Date;
	currentMonth: boolean;
}

const WEEKDAY_NAMES = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'];

export function weekdayNames(): string[] {
	return WEEKDAY_NAMES;
}

export function isSameDay(a: Date | null | undefined, b: Date | null | undefined): boolean {
	if (!a || !b) {
		return false;
	}
	return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function isBetween(date: Date, start: Date, end: Date): boolean {
	const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
	const startBound = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
	const endBound = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
	return startOfDay > startBound && startOfDay < endBound;
}

export function isBeforeDay(a: Date, b: Date): boolean {
	return new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime() < new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
}

export function isDateDisabled(date: Date, minDate: Date | undefined, maxDate: Date | undefined): boolean {
	if (minDate && isBeforeDay(date, minDate)) {
		return true;
	}
	if (maxDate && isBeforeDay(maxDate, date)) {
		return true;
	}
	return false;
}

export function withTime(date: Date, source: Date): Date {
	const next = new Date(date);
	next.setHours(source.getHours(), source.getMinutes(), 0, 0);
	return next;
}

export function generateMonthGrid(viewDate: Date): MonthCell[] {
	const year = viewDate.getFullYear();
	const month = viewDate.getMonth();
	const firstOfMonth = new Date(year, month, 1);
	const gridStart = new Date(year, month, 1 - firstOfMonth.getDay());

	const cells: MonthCell[] = [];
	for (let i = 0; i < 42; i++) {
		const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
		cells.push({ date, currentMonth: date.getMonth() === month });
	}
	return cells;
}

const MONTH_NAMES = [
	'enero',
	'febrero',
	'marzo',
	'abril',
	'mayo',
	'junio',
	'julio',
	'agosto',
	'septiembre',
	'octubre',
	'noviembre',
	'diciembre',
];

export function monthTitle(viewDate: Date): string {
	return `${MONTH_NAMES[viewDate.getMonth()]} ${viewDate.getFullYear()}`;
}

function pad2(value: number): string {
	return String(value).padStart(2, '0');
}

export function formatDate(date: Date, dateFormat: string): string {
	return dateFormat.replace(/yyyy|yy|mm|dd/g, (token) => {
		switch (token) {
			case 'dd':
				return pad2(date.getDate());
			case 'mm':
				return pad2(date.getMonth() + 1);
			case 'yyyy':
				return String(date.getFullYear());
			case 'yy':
				return pad2(date.getFullYear() % 100);
			default:
				return token;
		}
	});
}

export function formatTime(date: Date): string {
	return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

type DateToken = 'dd' | 'mm' | 'yy' | 'yyyy';

export function parseDate(text: string, dateFormat: string): Date | null {
	const tokenOrder: DateToken[] = [];
	const pattern = dateFormat.replace(/yyyy|yy|mm|dd/g, (token) => {
		tokenOrder.push(token as DateToken);
		return token === 'yyyy' ? '(\\d{4})' : '(\\d{1,2})';
	});

	const match = new RegExp(`^${pattern}$`).exec(text.trim());
	if (!match) {
		return null;
	}

	const now = new Date();
	let day = 1;
	let month = 0;
	let year = now.getFullYear();

	tokenOrder.forEach((token, index) => {
		const raw = Number(match[index + 1]);
		if (token === 'dd') {
			day = raw;
		} else if (token === 'mm') {
			month = raw - 1;
		} else if (token === 'yyyy') {
			year = raw;
		} else {
			year = 2000 + raw;
		}
	});

	const date = new Date(year, month, day);
	return Number.isNaN(date.getTime()) ? null : date;
}
