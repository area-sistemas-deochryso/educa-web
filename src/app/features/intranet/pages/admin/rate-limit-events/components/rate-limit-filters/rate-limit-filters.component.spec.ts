import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it, beforeEach } from 'vitest';

import { RateLimitEventFiltro } from '../../models';
import { RateLimitFiltersComponent } from './rate-limit-filters.component';

describe('RateLimitFiltersComponent', () => {
	let fixture: ComponentFixture<RateLimitFiltersComponent>;
	let component: RateLimitFiltersComponent;

	const initialFilter: RateLimitEventFiltro = {
		rol: null,
		policy: null,
		soloRechazados: false,
		desde: null,
		hasta: null,
		take: 200,
	};

	beforeEach(() => {
		TestBed.configureTestingModule({ imports: [RateLimitFiltersComponent] });
		fixture = TestBed.createComponent(RateLimitFiltersComponent);
		component = fixture.componentInstance;
		fixture.componentRef.setInput('filter', initialFilter);
	});

	it('onEndpointChange emite delta con endpoint no vacío', () => {
		let delta: Partial<RateLimitEventFiltro> | null = null;
		component.filterChange.subscribe((d) => (delta = d));

		component.onEndpointChange('/api/heavy');

		expect(delta).toEqual({ endpoint: '/api/heavy' });
	});

	it('onEndpointChange con string vacío emite undefined', () => {
		let delta: Partial<RateLimitEventFiltro> | null = null;
		component.filterChange.subscribe((d) => (delta = d));

		component.onEndpointChange('');

		expect(delta).toEqual({ endpoint: undefined });
	});

	it('onPolicyChange emite delta con policy', () => {
		let delta: Partial<RateLimitEventFiltro> | null = null;
		component.filterChange.subscribe((d) => (delta = d));

		component.onPolicyChange('heavy');

		expect(delta).toEqual({ policy: 'heavy' });
	});

	it('onSoloRechazadosChange emite delta con boolean', () => {
		let delta: Partial<RateLimitEventFiltro> | null = null;
		component.filterChange.subscribe((d) => (delta = d));

		component.onSoloRechazadosChange(true);

		expect(delta).toEqual({ soloRechazados: true });
	});

	it('onClear emite clearFilters event', () => {
		let emitted = false;
		component.clearFilters.subscribe(() => (emitted = true));

		component.onClear();

		expect(emitted).toBe(true);
	});
});
