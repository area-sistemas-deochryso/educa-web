import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BehaviorSubject, of } from 'rxjs';

import { CorrelationComponent } from './correlation.component';
import { CorrelationFacade } from './services';
import { CorrelationSnapshot } from './models';

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

	beforeEach(async () => {
		loadSnapshot = vi.fn();
		paramMap$ = new BehaviorSubject(new FakeParamMap({ id: 'abc-1' }));

		const facadeMock = {
			vm: () => ({
				snapshot: createSnapshot(),
				loading: false,
				error: null,
				correlationId: 'abc-1',
				errorLogs: [],
				rateLimitEvents: [],
				reportesUsuario: [],
				emailOutbox: [],
				totalEvents: 0,
			}),
			loadSnapshot,
			reset: vi.fn(),
		};

		await TestBed.configureTestingModule({
			imports: [CorrelationComponent],
			providers: [
				provideRouter([]),
				{ provide: CorrelationFacade, useValue: facadeMock },
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

	it('renders the 4 sections always (errors, rate-limit, reports, emails)', () => {
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
});
