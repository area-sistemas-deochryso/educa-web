// #region Imports
import { describe, it, expect, beforeEach } from 'vitest';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { form, FormField } from '@angular/forms/signals';
import { EduCheckbox } from '@edu-ui';

// #endregion
// #region Implementation
// * Evidencia del piloto P70-F4 (brief 852): un control edu-ui (ControlValueAccessor) bajo `[formField]`.
@Component({
	selector: 'app-signal-forms-eduui-host',
	standalone: true,
	imports: [FormField, EduCheckbox],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `<edu-checkbox [formField]="f.accept" label="Acepto" inputId="accept" />`,
})
class HostComponent {
	readonly model = signal({ accept: false });
	readonly f = form(this.model);
}

describe('Signal Forms + edu-ui (ControlValueAccessor)', () => {
	let fixture: ComponentFixture<HostComponent>;
	let host: HostComponent;

	const box = (): HTMLButtonElement => fixture.nativeElement.querySelector('button[role="checkbox"]');

	beforeEach(async () => {
		await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
		fixture = TestBed.createComponent(HostComponent);
		host = fixture.componentInstance;
		fixture.detectChanges();
		await fixture.whenStable();
	});

	it('should write the model value into the control (model → view)', async () => {
		host.model.set({ accept: true });
		fixture.detectChanges();
		await fixture.whenStable();
		fixture.detectChanges();

		expect(box().getAttribute('aria-checked')).toBe('true');
	});

	it('should push the control value into the model (view → model)', () => {
		box().click();

		expect(host.model().accept).toBe(true);
	});

	it('should mark the field as touched when the control reports touched', () => {
		expect(host.f.accept().touched()).toBe(false);

		box().click();

		expect(host.f.accept().touched()).toBe(true);
	});
});
// #endregion
