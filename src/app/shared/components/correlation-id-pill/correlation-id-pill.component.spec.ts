import { ComponentRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CorrelationIdPillComponent } from './correlation-id-pill.component';

function createRouterMock() {
	return {
		navigate: vi.fn().mockResolvedValue(true),
	};
}

describe('CorrelationIdPillComponent', () => {
	let fixture: ComponentFixture<CorrelationIdPillComponent>;
	let component: CorrelationIdPillComponent;
	let componentRef: ComponentRef<CorrelationIdPillComponent>;
	let router: ReturnType<typeof createRouterMock>;

	beforeEach(async () => {
		router = createRouterMock();
		await TestBed.configureTestingModule({
			imports: [CorrelationIdPillComponent],
			providers: [{ provide: Router, useValue: router }],
		}).compileComponents();

		fixture = TestBed.createComponent(CorrelationIdPillComponent);
		component = fixture.componentInstance;
		componentRef = fixture.componentRef;
	});

	it('renders the full id when not compact and exposes the canonical aria-label', () => {
		componentRef.setInput('id', 'abc-12345');
		fixture.detectChanges();

		expect(component.displayValue()).toBe('abc-12345');
		expect(component.ariaLabel()).toBe('Ver eventos del correlation id abc-12345');
		expect(component.tooltip()).toBe('');
	});

	it('navigates to the hub on click', () => {
		componentRef.setInput('id', 'abc-12345');
		fixture.detectChanges();

		const event = new MouseEvent('click');
		const stopSpy = vi.spyOn(event, 'stopPropagation');

		component.onClick(event);

		expect(stopSpy).toHaveBeenCalled();
		expect(router.navigate).toHaveBeenCalledWith([
			'/intranet/admin/correlation',
			'abc-12345',
		]);
	});

	it('truncates to 8 chars and shows tooltip with full id when compact', () => {
		componentRef.setInput('id', '0123456789abcdef');
		componentRef.setInput('compact', true);
		fixture.detectChanges();

		expect(component.displayValue()).toBe('01234567…');
		expect(component.tooltip()).toBe('0123456789abcdef');
	});

	it('renders a fallback when id is null and does not navigate', () => {
		componentRef.setInput('id', null);
		fixture.detectChanges();

		expect(component.isClickable()).toBe(false);
		expect(component.ariaLabel()).toBe('Sin correlation id disponible');

		component.onClick(new MouseEvent('click'));
		expect(router.navigate).not.toHaveBeenCalled();
	});

	it('keeps the full id when shorter than the compact cap', () => {
		componentRef.setInput('id', 'abc');
		componentRef.setInput('compact', true);
		fixture.detectChanges();

		expect(component.displayValue()).toBe('abc');
	});
});
