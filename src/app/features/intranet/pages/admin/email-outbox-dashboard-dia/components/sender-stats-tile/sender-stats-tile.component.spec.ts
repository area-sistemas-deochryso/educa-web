import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { SenderStatsTileComponent } from './sender-stats-tile.component';
import { DashboardSenderStat } from '../../models/email-monitoreo.models';

const SAMPLE: DashboardSenderStat[] = [
	{
		remitente: 'noreply@educa.pe',
		total: 200,
		enviados: 180,
		fallidos: 20,
		pendientes: 0,
		ultimoUso: '2026-04-30T10:00:00',
		tasaFalloPct: 10,
	},
	{
		remitente: 'alertas@educa.pe',
		total: 100,
		enviados: 60,
		fallidos: 40,
		pendientes: 0,
		ultimoUso: '2026-04-30T08:30:00',
		tasaFalloPct: 40,
	},
	{
		remitente: 'admin@educa.pe',
		total: 50,
		enviados: 50,
		fallidos: 0,
		pendientes: 0,
		ultimoUso: '2026-04-29T08:30:00',
		tasaFalloPct: 0,
	},
];

describe('SenderStatsTileComponent', () => {
	let fixture: ComponentFixture<SenderStatsTileComponent>;
	let component: SenderStatsTileComponent;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [SenderStatsTileComponent],
		}).compileComponents();
		fixture = TestBed.createComponent(SenderStatsTileComponent);
		component = fixture.componentInstance;
	});

	it('barras proporcionales y % calculado', () => {
		fixture.componentRef.setInput('items', SAMPLE);
		fixture.detectChanges();
		expect(component.maxTotal()).toBe(200);
		expect(component.percentageOfMax(200)).toBe(100);
		expect(component.percentageOfMax(100)).toBe(50);
		expect(component.percentageOfMax(50)).toBe(25);

		expect(component.severityClass(0)).toBe('ok');
		expect(component.severityClass(15)).toBe('warn');
		expect(component.severityClass(40)).toBe('danger');
	});
});
