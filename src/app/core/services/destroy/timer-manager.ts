/**
 * Utility to manage intervals and timeouts with centralized cleanup.
 */
export class TimerManager {
	private intervals: ReturnType<typeof setInterval>[] = [];
	private timeouts: ReturnType<typeof setTimeout>[] = [];

	/**
	 * Create and track an interval.
	 *
	 * @param callback Callback to run.
	 * @param ms Interval delay in ms.
	 * @returns Interval id.
	 */
	setInterval(callback: () => void, ms: number): ReturnType<typeof setInterval> {
		const id = setInterval(callback, ms);
		this.intervals.push(id);
		return id;
	}

	/**
	 * Create and track a timeout.
	 *
	 * @param callback Callback to run.
	 * @param ms Timeout delay in ms.
	 * @returns Timeout id.
	 */
	setTimeout(callback: () => void, ms: number): ReturnType<typeof setTimeout> {
		const id = setTimeout(callback, ms);
		this.timeouts.push(id);
		return id;
	}

	/**
	 * Clear a tracked interval.
	 *
	 * @param id Interval id.
	 */
	clearInterval(id: ReturnType<typeof setInterval>): void {
		clearInterval(id);
		this.intervals = this.intervals.filter((i) => i !== id);
	}

	/**
	 * Clear a tracked timeout.
	 *
	 * @param id Timeout id.
	 */
	clearTimeout(id: ReturnType<typeof setTimeout>): void {
		clearTimeout(id);
		this.timeouts = this.timeouts.filter((t) => t !== id);
	}

	/**
	 * Clear all tracked intervals and timeouts.
	 */
	clearAll(): void {
		this.intervals.forEach((id) => clearInterval(id));
		this.timeouts.forEach((id) => clearTimeout(id));
		this.intervals = [];
		this.timeouts = [];
	}
}
