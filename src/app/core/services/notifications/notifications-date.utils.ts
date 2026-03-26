/**
 * Date helper functions for seasonal notification scheduling.
 */

// #region Date helpers

/**
 * Check if date is within a day range in the current month.
 */
export function isWithinMonthDays(date: Date, startDay: number, endDay: number): boolean {
	const day = date.getDate();
	return day >= startDay && day <= endDay;
}

/**
 * Check if date is within a specific month (1 to 12).
 */
export function isMonth(date: Date, month: number): boolean {
	return date.getMonth() + 1 === month;
}

/**
 * Check if date is within a specific date range across months.
 */
export function isWithinDateRange(
	date: Date,
	startMonth: number,
	startDay: number,
	endMonth: number,
	endDay: number,
): boolean {
	const month = date.getMonth() + 1;
	const day = date.getDate();

	if (startMonth === endMonth) {
		return month === startMonth && day >= startDay && day <= endDay;
	}

	if (month === startMonth) return day >= startDay;
	if (month === endMonth) return day <= endDay;
	return month > startMonth && month < endMonth;
}

/**
 * Check if date is an exact month and day.
 */
export function isExactDate(date: Date, month: number, day: number): boolean {
	return date.getMonth() + 1 === month && date.getDate() === day;
}

/**
 * Check if date is in the last N days of the month.
 */
export function isLastDaysOfMonth(date: Date, days: number): boolean {
	const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
	return date.getDate() > lastDay - days;
}

/**
 * Check if date is a weekend.
 */
export function isWeekend(date: Date): boolean {
	const day = date.getDay();
	return day === 0 || day === 6;
}

// #endregion
