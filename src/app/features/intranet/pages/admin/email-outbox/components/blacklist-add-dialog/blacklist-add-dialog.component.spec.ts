import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BlacklistFormData } from '@data/models/email-blacklist.models';

import { BlacklistAddDialogComponent } from './blacklist-add-dialog.component';

const validFormData: BlacklistFormData = {
	correo: 'a@x.com',
	motivo: 'MANUAL',
	observacion: '',
};

describe('BlacklistAddDialogComponent', () => {
	let fixture: ComponentFixture<BlacklistAddDialogComponent>;
	let component: BlacklistAddDialogComponent;

	beforeEach(() => {
		TestBed.configureTestingModule({ imports: [BlacklistAddDialogComponent] });
		fixture = TestBed.createComponent(BlacklistAddDialogComponent);
		component = fixture.componentInstance;
		fixture.componentRef.setInput('formData', { ...validFormData });
		fixture.componentRef.setInput('visible', true);
		fixture.detectChanges();
	});

	it('motivoOptions solo expone MANUAL y BULK_IMPORT (D17.8)', () => {
		expect(component.motivoOptions.map((o) => o.value)).toEqual([
			'MANUAL',
			'BULK_IMPORT',
		]);
	});

	it('canSubmit es true con form válido', () => {
		expect(component.canSubmit()).toBe(true);
	});

	it('canSubmit es false sin correo', () => {
		fixture.componentRef.setInput('formData', { ...validFormData, correo: '' });
		fixture.detectChanges();
		expect(component.canSubmit()).toBe(false);
		expect(component.correoError()).toContain('obligatorio');
	});

	it('canSubmit es false con formato inválido', () => {
		fixture.componentRef.setInput('formData', { ...validFormData, correo: 'no-es-correo' });
		fixture.detectChanges();
		expect(component.canSubmit()).toBe(false);
		expect(component.correoError()).toContain('inválido');
	});

	it('canSubmit es false sin motivo', () => {
		fixture.componentRef.setInput('formData', { ...validFormData, motivo: null });
		fixture.detectChanges();
		expect(component.canSubmit()).toBe(false);
		expect(component.motivoError()).toContain('obligatorio');
	});

	it('onConfirm normaliza correo (trim + lowercase) y mapea observación vacía a null', () => {
		const spy = vi.fn();
		component.confirmAdd.subscribe(spy);
		fixture.componentRef.setInput('formData', {
			correo: '  USER@X.COM  ',
			motivo: 'MANUAL',
			observacion: '   ',
		});
		fixture.detectChanges();
		component.onConfirm();
		expect(spy).toHaveBeenCalledWith({
			correo: 'user@x.com',
			motivo: 'MANUAL',
			observacion: null,
		});
	});

	it('onConfirm con form inválido NO emite y marca touched', () => {
		const spy = vi.fn();
		component.confirmAdd.subscribe(spy);
		fixture.componentRef.setInput('formData', { ...validFormData, correo: '' });
		fixture.detectChanges();
		component.onConfirm();
		expect(spy).not.toHaveBeenCalled();
		expect(component.touched()).toBe(true);
	});
});
