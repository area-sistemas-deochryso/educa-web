import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EduMessageService } from './edu-message.service';
import { EduToast } from './edu-toast';

@Component({
	standalone: true,
	imports: [EduToast],
	template: `<edu-toast [life]="3000" />`,
})
class HostComponent {}

describe('EduToast — salida, cuenta regresiva y pausa', () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	function render() {
		const fixture = TestBed.createComponent(HostComponent);
		const service = TestBed.inject(EduMessageService);
		fixture.detectChanges();
		const settle = () => {
			fixture.detectChanges();
			TestBed.tick();
			fixture.detectChanges();
		};
		const item = () => fixture.nativeElement.querySelector('.edu-toast__item') as HTMLElement | null;
		const add = (options: { sticky?: boolean; life?: number } = {}) => {
			service.add({ severity: 'info', summary: 'Hola', detail: 'Detalle', ...options });
			settle();
		};
		return { service, settle, item, add, fixture };
	}

	it('al cerrarse retiene el toast como "leaving" y lo quita al terminar la salida', () => {
		const { service, settle, item, add } = render();
		add();

		vi.advanceTimersByTime(3000);
		settle();
		expect(item()?.classList.contains('edu-toast__item--leaving')).toBe(true);
		expect(service.messages()).toHaveLength(1);

		vi.advanceTimersByTime(600);
		settle();
		expect(item()).toBeNull();
		expect(service.messages()).toHaveLength(0);
	});

	it('el cierre manual también anima antes de quitar el nodo', () => {
		const { service, settle, item, add } = render();
		add({ sticky: true });

		(item()!.querySelector('.edu-toast__close') as HTMLButtonElement).click();
		settle();
		expect(item()?.classList.contains('edu-toast__item--leaving')).toBe(true);

		vi.advanceTimersByTime(600);
		settle();
		expect(service.messages()).toHaveLength(0);
	});

	it('la pausa por cursor detiene el cierre y al salir reanuda con el tiempo restante', () => {
		const { service, settle, item, add } = render();
		add();

		vi.advanceTimersByTime(1000);
		item()!.dispatchEvent(new MouseEvent('mouseenter'));
		settle();
		expect(item()?.hasAttribute('data-paused')).toBe(true);

		vi.advanceTimersByTime(10_000);
		settle();
		expect(item()?.classList.contains('edu-toast__item--leaving')).toBe(false);

		item()!.dispatchEvent(new MouseEvent('mouseleave'));
		settle();
		expect(item()?.hasAttribute('data-paused')).toBe(false);

		vi.advanceTimersByTime(1900);
		settle();
		expect(item()?.classList.contains('edu-toast__item--leaving')).toBe(false);
		vi.advanceTimersByTime(100);
		settle();
		expect(item()?.classList.contains('edu-toast__item--leaving')).toBe(true);
		expect(service.messages()).toHaveLength(1);
	});

	it('si cursor y foco pausan a la vez, solo reanuda al soltar ambos', () => {
		const { settle, item, add } = render();
		add();

		item()!.dispatchEvent(new MouseEvent('mouseenter'));
		item()!.dispatchEvent(new FocusEvent('focusin'));
		item()!.dispatchEvent(new MouseEvent('mouseleave'));
		settle();
		expect(item()?.hasAttribute('data-paused')).toBe(true);

		item()!.dispatchEvent(new FocusEvent('focusout', { relatedTarget: null }));
		settle();
		expect(item()?.hasAttribute('data-paused')).toBe(false);
	});

	it('un toast sticky no muestra barra y uno normal sí, con su duración', () => {
		const { item, add, settle } = render();
		add({ sticky: true });
		expect(item()!.querySelector('.edu-toast__bar')).toBeNull();

		TestBed.inject(EduMessageService).clear();
		settle();
		add({ life: 5000 });
		const bar = item()!.querySelector('.edu-toast__bar') as HTMLElement;
		expect(bar.getAttribute('aria-hidden')).toBe('true');
		expect(bar.style.getPropertyValue('--toast-life')).toBe('5000ms');
	});
});
