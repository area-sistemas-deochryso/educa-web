// #region Imports
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

// #endregion
// #region Implementation
const MONTHS = [
	{ short: 'Ene', long: 'Enero' },
	{ short: 'Feb', long: 'Febrero' },
	{ short: 'Mar', long: 'Marzo' },
	{ short: 'Abr', long: 'Abril' },
	{ short: 'May', long: 'Mayo' },
	{ short: 'Jun', long: 'Junio' },
	{ short: 'Jul', long: 'Julio' },
	{ short: 'Ago', long: 'Agosto' },
	{ short: 'Set', long: 'Setiembre' },
	{ short: 'Oct', long: 'Octubre' },
	{ short: 'Nov', long: 'Noviembre' },
	{ short: 'Dic', long: 'Diciembre' },
];

/** Título, navegación de año con flechas, "Hoy" y pastillas de mes con su cantidad de entradas. */
@Component({
	selector: 'app-calendar-header',
	templateUrl: './calendar-header.component.html',
	styleUrl: './calendar-header.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarHeaderComponent {
	readonly currentYear = input.required<number>();
	readonly currentMonth = input.required<number>();
	/** Entradas (feriados + eventos) por mes, 12 posiciones. */
	readonly monthCounts = input<number[]>([]);

	readonly goToToday = output<void>();
	readonly goToYear = output<number>();
	readonly goToMonth = output<number>();

	readonly months = MONTHS;

	countLabel(index: number): string {
		const count = this.monthCounts()[index] ?? 0;
		const noun = count === 1 ? 'entrada' : 'entradas';
		return `${MONTHS[index].long}, ${count} ${noun}`;
	}
}
// #endregion
