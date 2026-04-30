import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EmailBlacklistEntry } from '@data/models/email-blacklist.models';

import { BlacklistDetailDrawerComponent } from './blacklist-detail-drawer.component';

const mockEntry = (overrides: Partial<EmailBlacklistEntry> = {}): EmailBlacklistEntry => ({
	id: 1,
	correo: 'a@x.com',
	motivo: 'BOUNCE_5XX',
	motivoLabel: 'Bounce permanente 5.x.x',
	intentosFallidos: 3,
	ultimoError: 'smtp 5.1.1 mailbox unknown',
	estado: true,
	fechaPrimerFallo: '2026-04-28T10:00:00',
	fechaUltimoFallo: '2026-04-29T12:00:00',
	fechaReg: '2026-04-28T10:00:00',
	fechaMod: null,
	usuarioReg: 'admin',
	usuarioMod: null,
	...overrides,
});

describe('BlacklistDetailDrawerComponent', () => {
	let fixture: ComponentFixture<BlacklistDetailDrawerComponent>;
	let component: BlacklistDetailDrawerComponent;

	beforeEach(() => {
		TestBed.configureTestingModule({ imports: [BlacklistDetailDrawerComponent] });
		fixture = TestBed.createComponent(BlacklistDetailDrawerComponent);
		component = fixture.componentInstance;
		fixture.componentRef.setInput('visible', true);
	});

	it('onDespejar emite cuando la entry está activa', () => {
		const entry = mockEntry({ estado: true });
		fixture.componentRef.setInput('entry', entry);
		fixture.detectChanges();

		const spy = vi.fn();
		component.despejar.subscribe(spy);
		component.onDespejar();
		expect(spy).toHaveBeenCalledWith(entry);
	});

	it('onDespejar NO emite cuando la entry está despejada', () => {
		fixture.componentRef.setInput('entry', mockEntry({ estado: false }));
		fixture.detectChanges();

		const spy = vi.fn();
		component.despejar.subscribe(spy);
		component.onDespejar();
		expect(spy).not.toHaveBeenCalled();
	});

	it('onClose emite el output closeDrawer', () => {
		fixture.componentRef.setInput('entry', mockEntry());
		fixture.detectChanges();
		const spy = vi.fn();
		component.closeDrawer.subscribe(spy);
		component.onClose();
		expect(spy).toHaveBeenCalled();
	});

	it('onVisibleChange reemite el flag de visibilidad', () => {
		fixture.componentRef.setInput('entry', mockEntry());
		fixture.detectChanges();
		const spy = vi.fn();
		component.visibleChange.subscribe(spy);
		component.onVisibleChange(false);
		expect(spy).toHaveBeenCalledWith(false);
	});
});
