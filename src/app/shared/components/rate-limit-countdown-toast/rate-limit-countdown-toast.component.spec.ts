import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RateLimitCountdownService } from '@core/services/rate-limit-countdown';

import { RateLimitCountdownToastComponent } from './rate-limit-countdown-toast.component';

describe('RateLimitCountdownToastComponent', () => {
	let fixture: ComponentFixture<RateLimitCountdownToastComponent>;
	let countdown: RateLimitCountdownService;

	beforeEach(() => {
		vi.useFakeTimers();
		TestBed.configureTestingModule({
			imports: [RateLimitCountdownToastComponent],
			providers: [RateLimitCountdownService],
		});
		fixture = TestBed.createComponent(RateLimitCountdownToastComponent);
		countdown = TestBed.inject(RateLimitCountdownService);
	});

	afterEach(() => {
		countdown.stop();
		vi.useRealTimers();
	});

	it('no renderiza cuando countdown no está activo', () => {
		fixture.detectChanges();

		const toast = (fixture.nativeElement as HTMLElement).querySelector('.rate-limit-toast');
		expect(toast).toBeNull();
	});

	it('renderiza con el tiempo restante y el título', () => {
		countdown.start(30, '/api/x');
		fixture.detectChanges();

		const toast = (fixture.nativeElement as HTMLElement).querySelector('.rate-limit-toast');
		expect(toast).not.toBeNull();

		const text = toast!.textContent ?? '';
		expect(text).toContain('Demasiadas solicitudes');
		expect(text).toContain('30 segundos');
	});

	it('pluraliza a "1 segundo" singular', () => {
		countdown.start(1, '/api/x');
		fixture.detectChanges();

		const text =
			(fixture.nativeElement as HTMLElement).querySelector('.rate-limit-toast__detail')
				?.textContent ?? '';
		expect(text).toContain('1 segundo');
		expect(text).not.toContain('1 segundos');
	});

	it('clic en cerrar llama countdown.stop', () => {
		countdown.start(30, '/api/x');
		fixture.detectChanges();

		const closeBtn = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
			'.rate-limit-toast__close',
		);
		closeBtn!.click();
		fixture.detectChanges();

		expect(countdown.isActive()).toBe(false);
		const toast = (fixture.nativeElement as HTMLElement).querySelector('.rate-limit-toast');
		expect(toast).toBeNull();
	});
});
