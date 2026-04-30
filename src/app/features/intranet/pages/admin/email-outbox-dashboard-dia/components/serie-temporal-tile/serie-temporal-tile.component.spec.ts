import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SerieTemporalTileComponent } from './serie-temporal-tile.component';

describe('SerieTemporalTileComponent', () => {
	let fixture: ComponentFixture<SerieTemporalTileComponent>;
	let component: SerieTemporalTileComponent;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [SerieTemporalTileComponent],
		}).compileComponents();
		fixture = TestBed.createComponent(SerieTemporalTileComponent);
		component = fixture.componentInstance;
	});

	it('toggle hour/day emite granularidadChange', () => {
		const spy = vi.fn();
		component.granularidadChange.subscribe(spy);
		component.onGranularidadChange('day');
		expect(spy).toHaveBeenCalledWith('day');
	});

	it('buckets calcula porcentajes proporcionales al máximo total', () => {
		fixture.componentRef.setInput('items', [
			{ bucket: '2026-04-30T08:00:00', enviados: 50, fallidos: 30, bloqueadosPorCuota: 20 }, // total 100
			{ bucket: '2026-04-30T09:00:00', enviados: 25, fallidos: 15, bloqueadosPorCuota: 10 }, // total 50
			{ bucket: '2026-04-30T10:00:00', enviados: 0, fallidos: 0, bloqueadosPorCuota: 0 }, // total 0
		]);
		fixture.detectChanges();
		expect(component.maxTotal()).toBe(100);
		const buckets = component.buckets();
		expect(buckets[0].enviadosPct).toBe(50);
		expect(buckets[1].enviadosPct).toBe(25);
		expect(buckets[2].enviadosPct).toBe(0);
	});
});
