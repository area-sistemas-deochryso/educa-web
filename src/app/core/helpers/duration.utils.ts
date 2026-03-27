// #region Tipos
/**
 * Unidad de tiempo soportada para conversiones.
 * Permite expresar duraciones de forma semántica sin magic numbers.
 */
export type TimeUnit = 'ms' | 's' | 'min' | 'h' | 'd';

/** Factores de conversión a milisegundos */
const MS_FACTORS: Record<TimeUnit, number> = {
	ms: 1,
	s: 1_000,
	min: 60_000,
	h: 3_600_000,
	d: 86_400_000,
};
// #endregion

// #region Clase Duration
/**
 * Representación inmutable de una duración de tiempo.
 *
 * Reemplaza magic numbers como `5 * 60 * 1000` por `Duration.minutes(5)`.
 * Permite conversiones entre unidades sin errores de cálculo manual.
 *
 * @example
 * // Crear duraciones
 * const timeout = Duration.seconds(15);
 * const interval = Duration.minutes(5);
 * const expiry = Duration.hours(1);
 *
 * // Usar en código
 * setTimeout(callback, timeout.ms);
 * setInterval(callback, interval.ms);
 *
 * // Convertir entre unidades
 * Duration.minutes(5).to('s');  // 300
 * Duration.hours(1).to('min');  // 60
 */
export class Duration {
	/** Valor interno en milisegundos */
	readonly ms: number;

	private constructor(value: number, unit: TimeUnit) {
		this.ms = value * MS_FACTORS[unit];
	}

	// #region Factory methods
	static milliseconds(n: number): Duration {
		return new Duration(n, 'ms');
	}
	static seconds(n: number): Duration {
		return new Duration(n, 's');
	}
	static minutes(n: number): Duration {
		return new Duration(n, 'min');
	}
	static hours(n: number): Duration {
		return new Duration(n, 'h');
	}
	static days(n: number): Duration {
		return new Duration(n, 'd');
	}
	// #endregion

	// #region Conversiones
	/** Convierte a la unidad especificada */
	to(unit: TimeUnit): number {
		return this.ms / MS_FACTORS[unit];
	}

	/** Alias: valor en segundos */
	get seconds(): number {
		return this.to('s');
	}
	/** Alias: valor en minutos */
	get minutes(): number {
		return this.to('min');
	}
	// #endregion

	// #region Operaciones
	/** Suma otra duración, retorna nueva instancia */
	plus(other: Duration): Duration {
		return Duration.milliseconds(this.ms + other.ms);
	}

	/** Multiplica por un factor, retorna nueva instancia */
	times(factor: number): Duration {
		return Duration.milliseconds(this.ms * factor);
	}
	// #endregion
}
// #endregion
