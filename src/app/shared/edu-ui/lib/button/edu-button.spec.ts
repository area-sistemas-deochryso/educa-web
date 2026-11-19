import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { EduButton, EduButtonSeverity } from './edu-button';

@Component({
	standalone: true,
	imports: [EduButton],
	template: `<edu-button label="Guardar" [loading]="loading()" [success]="success()" [ripple]="ripple()" [severity]="severity()" [text]="text()" />`,
})
class HostComponent {
	readonly loading = signal(false);
	readonly success = signal(false);
	readonly ripple = signal(false);
	readonly severity = signal<EduButtonSeverity>('primary');
	readonly text = signal(false);
}

describe('EduButton — éxito y onda', () => {
	async function render() {
		const fixture = TestBed.createComponent(HostComponent);
		fixture.detectChanges();
		await fixture.whenStable();
		const settle = async () => {
			fixture.detectChanges();
			await fixture.whenStable();
		};
		const button = () => fixture.nativeElement.querySelector('button') as HTMLButtonElement;
		const status = () => (fixture.nativeElement.querySelector('.edu-button__status') as HTMLElement).textContent?.trim();
		return { fixture, settle, button, status, host: fixture.componentInstance };
	}

	it('sin success mantiene el render actual', async () => {
		const { button, status } = await render();
		expect(button().querySelector('.pi-check')).toBeNull();
		expect(button().hasAttribute('data-success')).toBe(false);
		expect(button().classList.contains('motion-ripple')).toBe(false);
		expect(status()).toBe('');
	});

	it('success muestra el check y anuncia el estado', async () => {
		const { host, settle, button, status } = await render();
		host.success.set(true);
		await settle();
		expect(button().querySelector('.pi-check')).not.toBeNull();
		expect(button().getAttribute('data-success')).toBe('true');
		expect(status()).toBe('Completado');
	});

	it('loading tiene prioridad sobre success', async () => {
		const { host, settle, button, status } = await render();
		host.success.set(true);
		host.loading.set(true);
		await settle();
		expect(button().querySelector('.pi-spinner')).not.toBeNull();
		expect(button().querySelector('.pi-check')).toBeNull();
		expect(button().getAttribute('aria-busy')).toBe('true');
		expect(status()).toBe('');
	});

	it('la onda solo se activa en primary sin text y con ripple', async () => {
		const { host, settle, button } = await render();
		host.ripple.set(true);
		await settle();
		expect(button().classList.contains('motion-ripple')).toBe(true);

		host.severity.set('danger');
		await settle();
		expect(button().classList.contains('motion-ripple')).toBe(false);

		host.severity.set('primary');
		host.text.set(true);
		await settle();
		expect(button().classList.contains('motion-ripple')).toBe(false);
	});

	it('pointerdown fija el origen de la onda y agrega is-rippling', async () => {
		const { host, settle, button } = await render();
		host.ripple.set(true);
		await settle();
		button().dispatchEvent(new MouseEvent('pointerdown', { clientX: 10, clientY: 5, bubbles: true }));
		expect(button().classList.contains('is-rippling')).toBe(true);
		expect(button().style.getPropertyValue('--ripple-x')).toMatch(/px$/);
	});
});
