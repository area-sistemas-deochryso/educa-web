import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { EduShakeOnInvalid } from './edu-shake-on-invalid';

@Component({
	standalone: true,
	imports: [EduShakeOnInvalid],
	template: `
		<input id="attr" eduShakeOnInvalid [attr.aria-invalid]="attrInvalid() ? 'true' : null" />
		<div id="bound" [eduShakeOnInvalid]="boundInvalid()"></div>
	`,
})
class HostComponent {
	readonly attrInvalid = signal(false);
	readonly boundInvalid = signal(false);
}

describe('EduShakeOnInvalid', () => {
	async function render(initial?: { attr?: boolean; bound?: boolean }) {
		const fixture = TestBed.createComponent(HostComponent);
		fixture.componentInstance.attrInvalid.set(initial?.attr ?? false);
		fixture.componentInstance.boundInvalid.set(initial?.bound ?? false);
		fixture.detectChanges();
		await fixture.whenStable();
		const settle = async () => {
			fixture.detectChanges();
			await fixture.whenStable();
			await new Promise<void>((resolve) => setTimeout(resolve));
		};
		const attr = () => fixture.nativeElement.querySelector('#attr') as HTMLElement;
		const bound = () => fixture.nativeElement.querySelector('#bound') as HTMLElement;
		return { host: fixture.componentInstance, settle, attr, bound };
	}

	it('sacude al pasar de válido a inválido por aria-invalid', async () => {
		const { host, settle, attr } = await render();
		expect(attr().classList.contains('motion-shake')).toBe(false);
		host.attrInvalid.set(true);
		await settle();
		expect(attr().classList.contains('motion-shake')).toBe(true);
		expect(attr().getAttribute('aria-invalid')).toBe('true');
	});

	it('no sacude si ya está inválido al montar', async () => {
		const { attr, bound } = await render({ attr: true, bound: true });
		expect(attr().classList.contains('motion-shake')).toBe(false);
		expect(bound().classList.contains('motion-shake')).toBe(false);
	});

	it('vuelve a sacudir al invalidarse otra vez tras corregir', async () => {
		const { host, settle, attr } = await render();
		host.attrInvalid.set(true);
		await settle();
		attr().dispatchEvent(Object.assign(new Event('animationend'), { animationName: 'motion-shake' }));
		expect(attr().classList.contains('motion-shake')).toBe(false);
		host.attrInvalid.set(false);
		await settle();
		host.attrInvalid.set(true);
		await settle();
		expect(attr().classList.contains('motion-shake')).toBe(true);
	});

	it('usa el estado enlazado cuando se pasa un valor', async () => {
		const { host, settle, bound } = await render();
		host.boundInvalid.set(true);
		await settle();
		expect(bound().classList.contains('motion-shake')).toBe(true);
	});
});
