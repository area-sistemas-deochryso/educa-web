import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EmailBlacklistEntry } from '@data/models/email-blacklist.models';

import { BlacklistTableComponent } from './blacklist-table.component';

const mockEntry = (overrides: Partial<EmailBlacklistEntry> = {}): EmailBlacklistEntry => ({
	id: 1,
	correo: 'a@x.com',
	motivo: 'BOUNCE_5XX',
	motivoLabel: 'Bounce permanente 5.x.x',
	intentosFallidos: 3,
	ultimoError: null,
	estado: true,
	fechaPrimerFallo: null,
	fechaUltimoFallo: '2026-04-29T12:00:00',
	fechaReg: '2026-04-29T11:00:00',
	fechaMod: null,
	usuarioReg: 'admin',
	usuarioMod: null,
	...overrides,
});

describe('BlacklistTableComponent', () => {
	let fixture: ComponentFixture<BlacklistTableComponent>;
	let component: BlacklistTableComponent;

	beforeEach(() => {
		TestBed.configureTestingModule({ imports: [BlacklistTableComponent] });
		fixture = TestBed.createComponent(BlacklistTableComponent);
		component = fixture.componentInstance;
		fixture.componentRef.setInput('items', []);
		fixture.componentRef.setInput('total', 0);
		fixture.componentRef.setInput('page', 1);
		fixture.componentRef.setInput('pageSize', 20);
		fixture.componentRef.setInput('hasActiveFilters', false);
		fixture.detectChanges();
	});

	it('expone skeletonColumns con 7 columnas (id, recipient, motivo, hits, fecha, estado, acciones)', () => {
		expect(BlacklistTableComponent.skeletonColumns).toHaveLength(7);
	});

	it('estadoLabel devuelve "Activa" / "Despejada"', () => {
		expect(component.estadoLabel(true)).toBe('Activa');
		expect(component.estadoLabel(false)).toBe('Despejada');
	});

	it('estadoSeverity delega a UiMappingService', () => {
		expect(component.estadoSeverity(true)).toBe('success');
		expect(component.estadoSeverity(false)).toBe('danger');
	});

	it('onViewDetail emite el item', () => {
		const spy = vi.fn();
		component.viewDetail.subscribe(spy);
		const entry = mockEntry({ id: 7 });
		component.onViewDetail(entry);
		expect(spy).toHaveBeenCalledWith(entry);
	});

	it('onDespejar emite el item', () => {
		const spy = vi.fn();
		component.despejar.subscribe(spy);
		const entry = mockEntry({ id: 9 });
		component.onDespejar(entry);
		expect(spy).toHaveBeenCalledWith(entry);
	});

	it('onLazyLoad reemite el evento de PrimeNG', () => {
		const spy = vi.fn();
		component.lazyLoad.subscribe(spy);
		const event = { first: 20, rows: 20 };
		component.onLazyLoad(event);
		expect(spy).toHaveBeenCalledWith(event);
	});
});
