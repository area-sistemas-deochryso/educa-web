import { DestroyRef, Injectable, inject } from '@angular/core';

import type { ClientMetricsSnapshot } from './error-reporter.models';

const MAX_SNAPSHOTS = 5;
const SAMPLE_INTERVAL_MS = 30_000;

@Injectable({ providedIn: 'root' })
export class ClientMetricsBufferService {
	private readonly destroyRef = inject(DestroyRef);
	private readonly isBrowser = typeof window !== 'undefined';

	private readonly buffer: ClientMetricsSnapshot[] = [];
	private longTaskCount = 0;
	private batteryLevelCache: number | null = null;
	private intervalId: ReturnType<typeof setInterval> | null = null;

	constructor() {
		if (!this.isBrowser) return;
		this.observeLongTasks();
		this.cacheBatteryLevel();
		this.startSampling();
		this.destroyRef.onDestroy(() => {
			if (this.intervalId) clearInterval(this.intervalId);
		});
	}

	drain(): ClientMetricsSnapshot[] {
		const snapshots = [...this.buffer];
		this.buffer.length = 0;
		return snapshots;
	}

	private startSampling(): void {
		this.takeSample();
		this.intervalId = setInterval(() => this.takeSample(), SAMPLE_INTERVAL_MS);
	}

	private takeSample(): void {
		const perf = performance as Performance & { memory?: { usedJSHeapSize?: number } };
		const heapBytes = perf.memory?.usedJSHeapSize ?? null;

		const snapshot: ClientMetricsSnapshot = {
			ts: new Date().toISOString(),
			heapUsedMB: heapBytes !== null ? Math.round((heapBytes / 1_048_576) * 10) / 10 : null,
			longTaskCount: this.longTaskCount,
			batteryLevel: this.batteryLevelCache,
		};

		this.longTaskCount = 0;

		if (this.buffer.length >= MAX_SNAPSHOTS) {
			this.buffer.shift();
		}
		this.buffer.push(snapshot);
	}

	private observeLongTasks(): void {
		if (typeof PerformanceObserver === 'undefined') return;
		try {
			const observer = new PerformanceObserver((list) => {
				this.longTaskCount += list.getEntries().length;
			});
			observer.observe({ type: 'longtask', buffered: true });
			this.destroyRef.onDestroy(() => observer.disconnect());
		} catch {
			// longtask not supported in this browser
		}
	}

	private cacheBatteryLevel(): void {
		const nav = navigator as Navigator & { getBattery?: () => Promise<{ level: number }> };
		if (!nav.getBattery) return;
		nav.getBattery().then(
			(battery) => { this.batteryLevelCache = Math.round(battery.level * 100); },
			() => { /* getBattery rejected — ignore */ },
		);
	}
}
