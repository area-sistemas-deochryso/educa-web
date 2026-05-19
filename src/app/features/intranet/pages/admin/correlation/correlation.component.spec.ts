import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BehaviorSubject, of } from 'rxjs';

import { CorrelationComponent } from './correlation.component';
import { CorrelationFacade } from './services';
import { CorrelationSnapshot } from './models';
import { StorageService } from '@core/services';

class FakeParamMap {
	constructor(private map: Record<string, string>) {}
	get(key: string): string | null {
		return this.map[key] ?? null;
	}
	has(key: string): boolean {
		return key in this.map;
	}
	getAll(key: string): string[] {
		return key in this.map ? [this.map[key]] : [];
	}
	get keys(): string[] {
		return Object.keys(this.map);
	}
}

function createSnapshot(over: Partial<CorrelationSnapshot> = {}): CorrelationSnapshot {
	return {
		correlationId: 'abc-1',
		generatedAt: '2026-04-25T10:00:00',
		errorLogs: [],
		rateLimitEvents: [],
		reportesUsuario: [],
		emailOutbox: [],
		...over,
	};
}

describe('CorrelationComponent', () => {
	let fixture: ComponentFixture<CorrelationComponent>;
	let component: CorrelationComponent;
	let loadSnapshot: ReturnType<typeof vi.fn>;
	let paramMap$: BehaviorSubject<FakeParamMap>;
	let getCorrelationViewMode: ReturnType<typeof vi.fn>;
	let setCorrelationViewMode: ReturnType<typeof vi.fn>;
	let getCorrelationAutoRefresh: ReturnType<typeof vi.fn>;
	let setCorrelationAutoRefresh: ReturnType<typeof vi.fn>;
	let currentSnapshot: CorrelationSnapshot | null;

	beforeEach(async () => {
		loadSnapshot = vi.fn();
		paramMap$ = new BehaviorSubject(new FakeParamMap({ id: 'abc-1' }));
		getCorrelationViewMode = vi.fn().mockReturnValue('timeline');
		setCorrelationViewMode = vi.fn();
		getCorrelationAutoRefresh = vi.fn().mockReturnValue(false);
		setCorrelationAutoRefresh = vi.fn();
		currentSnapshot = createSnapshot();

		const facadeMock = {
			vm: () => ({
				snapshot: currentSnapshot,
				loading: false,
				error: null,
				correlationId: 'abc-1',
				errorLogs: [],
				rateLimitEvents: [],
				reportesUsuario: [],
				emailOutbox: [],
				totalEvents: 0,
				timelineEvents: [],
				hasDefensiveCap: false,
			}),
			loadSnapshot,
			reset: vi.fn(),
		};

		const storageMock = {
			getCorrelationViewMode,
			setCorrelationViewMode,
			getCorrelationAutoRefresh,
			setCorrelationAutoRefresh,
		};

		await TestBed.configureTestingModule({
			imports: [CorrelationComponent],
			providers: [
				provideRouter([]),
				{ provide: CorrelationFacade, useValue: facadeMock },
				{ provide: StorageService, useValue: storageMock },
				{
					provide: ActivatedRoute,
					useValue: {
						paramMap: paramMap$.asObservable(),
						queryParamMap: of(new FakeParamMap({})),
					},
				},
			],
		}).compileComponents();

		fixture = TestBed.createComponent(CorrelationComponent);
		component = fixture.componentInstance;
	});

	it('reads :id from paramMap and fires loadSnapshot on init', () => {
		fixture.detectChanges();
		component.ngOnInit();

		expect(loadSnapshot).toHaveBeenCalledWith('abc-1');
	});

	it('renders the timeline section by default (Plan 41 F1)', () => {
		fixture.detectChanges();

		const html = fixture.nativeElement.innerHTML as string;
		expect(html).toContain('app-correlation-timeline-section');
	});

	it('renders the 4 sections when viewMode is "section"', () => {
		fixture.detectChanges();
		component.onToggleView('section');
		fixture.detectChanges();

		const html = fixture.nativeElement.innerHTML as string;
		expect(html).toContain('app-correlation-errors-section');
		expect(html).toContain('app-correlation-rate-limit-section');
		expect(html).toContain('app-correlation-reports-section');
		expect(html).toContain('app-correlation-emails-section');
	});

	it('does not call loadSnapshot when paramMap has no id', () => {
		paramMap$.next(new FakeParamMap({}));
		fixture.detectChanges();
		component.ngOnInit();

		expect(loadSnapshot).not.toHaveBeenCalled();
	});

	it('initializes viewMode from storage', () => {
		expect(getCorrelationViewMode).toHaveBeenCalled();
		expect(component.viewMode()).toBe('timeline');
	});

	it('persists viewMode when toggled', () => {
		fixture.detectChanges();

		component.onToggleView('section');
		expect(component.viewMode()).toBe('section');
		expect(setCorrelationViewMode).toHaveBeenCalledWith('section');
	});

	it('does not persist when toggling to the current mode (no-op)', () => {
		fixture.detectChanges();

		component.onToggleView('timeline'); // already timeline by default
		expect(setCorrelationViewMode).not.toHaveBeenCalled();
	});

	describe('Plan 41 Chat 11 — auto-refresh opt-in', () => {
		it('initializes autoRefresh from storage (default off)', () => {
			fixture.detectChanges();
			expect(getCorrelationAutoRefresh).toHaveBeenCalled();
			expect(component.autoRefresh()).toBe(false);
		});

		it('toggle persists the new value and updates the signal', () => {
			fixture.detectChanges();
			component.onToggleAutoRefresh();
			expect(component.autoRefresh()).toBe(true);
			expect(setCorrelationAutoRefresh).toHaveBeenCalledWith(true);

			component.onToggleAutoRefresh();
			expect(component.autoRefresh()).toBe(false);
			expect(setCorrelationAutoRefresh).toHaveBeenLastCalledWith(false);
		});

		it('starts polling and fires loadSnapshot every 30s when enabled', () => {
			vi.useFakeTimers();
			try {
				fixture.detectChanges();
				loadSnapshot.mockClear();

				component.onToggleAutoRefresh();
				expect(loadSnapshot).not.toHaveBeenCalled();

				vi.advanceTimersByTime(30_000);
				expect(loadSnapshot).toHaveBeenCalledWith('abc-1');
				expect(loadSnapshot).toHaveBeenCalledTimes(1);

				vi.advanceTimersByTime(30_000);
				expect(loadSnapshot).toHaveBeenCalledTimes(2);
			} finally {
				vi.useRealTimers();
			}
		});

		it('stops polling when toggled off', () => {
			vi.useFakeTimers();
			try {
				fixture.detectChanges();
				component.onToggleAutoRefresh(); // ON
				loadSnapshot.mockClear();

				component.onToggleAutoRefresh(); // OFF
				vi.advanceTimersByTime(60_000);
				expect(loadSnapshot).not.toHaveBeenCalled();
			} finally {
				vi.useRealTimers();
			}
		});

		it('does not fire loadSnapshot when document is hidden', () => {
			vi.useFakeTimers();
			const hiddenSpy = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
			try {
				fixture.detectChanges();
				component.onToggleAutoRefresh(); // ON
				loadSnapshot.mockClear();

				vi.advanceTimersByTime(30_000);
				expect(loadSnapshot).not.toHaveBeenCalled();
			} finally {
				vi.useRealTimers();
				hiddenSpy.mockRestore();
			}
		});

		it('starts polling on init when storage returns true', async () => {
			getCorrelationAutoRefresh.mockReturnValue(true);
			vi.useFakeTimers();
			try {
				// Reconstruir el fixture para que la signal se inicialice con true
				const newFixture = TestBed.createComponent(CorrelationComponent);
				newFixture.detectChanges();
				loadSnapshot.mockClear();

				vi.advanceTimersByTime(30_000);
				expect(loadSnapshot).toHaveBeenCalledWith('abc-1');
			} finally {
				vi.useRealTimers();
			}
		});
	});

	describe('Plan 41 Chat 3b — related correlation ids', () => {
		it('does not render the section when relatedCorrelationIds is undefined', () => {
			currentSnapshot = createSnapshot();
			fixture.detectChanges();

			const html = fixture.nativeElement.innerHTML as string;
			expect(component.hasRelatedIds()).toBe(false);
			expect(html).not.toContain('related-correlation-ids');
		});

		it('does not render the section when relatedCorrelationIds is empty', () => {
			currentSnapshot = createSnapshot({ relatedCorrelationIds: [] });
			fixture.detectChanges();

			const html = fixture.nativeElement.innerHTML as string;
			expect(component.hasRelatedIds()).toBe(false);
			expect(html).not.toContain('related-correlation-ids');
		});

		it('renders N pills (compact) when relatedCorrelationIds has N ids', () => {
			currentSnapshot = createSnapshot({
				relatedCorrelationIds: ['a1b2c3d4-1', 'a1b2c3d4-2', 'a1b2c3d4-3'],
			});
			fixture.detectChanges();

			expect(component.hasRelatedIds()).toBe(true);
			expect(component.relatedIds()).toHaveLength(3);
			const pills = fixture.nativeElement.querySelectorAll('app-correlation-id-pill');
			expect(pills.length).toBe(3);
		});
	});
});
