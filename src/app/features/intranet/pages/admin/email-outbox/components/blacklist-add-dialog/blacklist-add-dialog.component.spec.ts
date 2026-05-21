import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BlacklistFormData } from '@data/models';

import { BlacklistAddDialogComponent } from './blacklist-add-dialog.component';

// Plan 43 Chat 2.1: motivo MANUAL exige observación ≥20 chars. El form válido
// canónico ya pasa ese piso para no romper los tests que valoran otros campos.
const validFormData: BlacklistFormData = {
	correo: 'a@x.com',
	motivo: 'MANUAL',
	observacion: 'Bloqueado por abuso reportado por el admin',
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

	it('onConfirm normaliza correo (trim + lowercase) y preserva observación', () => {
		const spy = vi.fn();
		component.confirmAdd.subscribe(spy);
		fixture.componentRef.setInput('formData', {
			correo: '  USER@X.COM  ',
			motivo: 'BULK_IMPORT',
			observacion: '   ',
		});
		fixture.detectChanges();
		component.onConfirm();
		expect(spy).toHaveBeenCalledWith({
			correo: 'user@x.com',
			motivo: 'BULK_IMPORT',
			observacion: null,
		});
	});

	// Plan 43 Chat 2.1 (A7+B7) — textarea obligatoria para motivo=MANUAL.
	it('motivo MANUAL con observación <20 chars bloquea submit', () => {
		fixture.componentRef.setInput('formData', {
			correo: 'x@y.com',
			motivo: 'MANUAL',
			observacion: 'corto',
		});
		fixture.detectChanges();
		expect(component.canSubmit()).toBe(false);
		expect(component.observacionError()).toContain('Mínimo');
	});

	it('motivo MANUAL con observación ≥20 chars habilita submit', () => {
		fixture.componentRef.setInput('formData', {
			correo: 'x@y.com',
			motivo: 'MANUAL',
			observacion: 'Veinte caracteres exactos!!',
		});
		fixture.detectChanges();
		expect(component.canSubmit()).toBe(true);
		expect(component.observacionError()).toBeNull();
	});

	it('motivo BULK_IMPORT no exige observación mínima', () => {
		fixture.componentRef.setInput('formData', {
			correo: 'x@y.com',
			motivo: 'BULK_IMPORT',
			observacion: '',
		});
		fixture.detectChanges();
		expect(component.observacionError()).toBeNull();
		expect(component.canSubmit()).toBe(true);
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
