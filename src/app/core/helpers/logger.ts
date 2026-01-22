import { environment } from '@config';

type LogLevel = 'log' | 'warn' | 'error' | 'info' | 'debug';

/**
 * Logger helper que respeta el environment
 * En producción no muestra logs, en desarrollo sí
 */
class Logger {
	private get isProduction(): boolean {
		return environment.production;
	}

	/**
	 * Log general (equivalente a console.log)
	 */
	log(...args: unknown[]): void {
		if (!this.isProduction) {
			console.log(...args);
		}
	}

	/**
	 * Warning (equivalente a console.warn)
	 */
	warn(...args: unknown[]): void {
		if (!this.isProduction) {
			console.warn(...args);
		}
	}

	/**
	 * Error (equivalente a console.error)
	 * NOTA: Los errores SÍ se muestran en producción para debugging crítico
	 */
	error(...args: unknown[]): void {
		console.error(...args);
	}

	/**
	 * Info (equivalente a console.info)
	 */
	info(...args: unknown[]): void {
		if (!this.isProduction) {
			console.info(...args);
		}
	}

	/**
	 * Debug (equivalente a console.debug)
	 */
	debug(...args: unknown[]): void {
		if (!this.isProduction) {
			console.debug(...args);
		}
	}

	/**
	 * Log con prefijo/tag para identificar el origen
	 */
	tagged(tag: string, level: LogLevel, ...args: unknown[]): void {
		const prefix = `[${tag}]`;
		switch (level) {
			case 'log':
				this.log(prefix, ...args);
				break;
			case 'warn':
				this.warn(prefix, ...args);
				break;
			case 'error':
				this.error(prefix, ...args);
				break;
			case 'info':
				this.info(prefix, ...args);
				break;
			case 'debug':
				this.debug(prefix, ...args);
				break;
		}
	}
}

/**
 * Instancia singleton del logger
 */
export const logger = new Logger();
