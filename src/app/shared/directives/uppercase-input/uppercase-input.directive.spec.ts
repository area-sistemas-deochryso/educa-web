// #region Imports
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { describe, it, expect, beforeEach } from 'vitest';

import { UppercaseInputDirective } from './uppercase-input.directive';

// #endregion
// #region Implementation
@Component({
	standalone: true,
	imports: [UppercaseInputDirective, ReactiveFormsModule],
	template: `
		<input id="test-input" [formControl]="testControl" appUppercaseInput />
		<textarea id="test-textarea" [formControl]="textareaControl" appUppercaseInput></textarea>
	`,
})
class TestHostComponent {
	testControl = new FormControl('');
	textareaControl = new FormControl('');
}

describe('UppercaseInputDirective', () => {
	let fixture: ComponentFixture<TestHostComponent>;
	let component: TestHostComponent;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [TestHostComponent],
		}).compileComponents();

		fixture = TestBed.createComponent(TestHostComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	describe('input element', () => {
		it('should convert lowercase to uppercase on input', () => {
			const inputEl = fixture.debugElement.query(By.css('#test-input'));
			const nativeInput = inputEl.nativeElement as HTMLInputElement;

			// Simulate typing
			nativeInput.value = 'hello';
			inputEl.triggerEventHandler('input', { target: nativeInput });
			fixture.detectChanges();

			expect(nativeInput.value).toBe('HELLO');
			expect(component.testControl.value).toBe('HELLO');
		});

		it('should keep uppercase text unchanged', () => {
			const inputEl = fixture.debugElement.query(By.css('#test-input'));
			const nativeInput = inputEl.nativeElement as HTMLInputElement;

			nativeInput.value = 'WORLD';
			inputEl.triggerEventHandler('input', { target: nativeInput });
			fixture.detectChanges();

			expect(nativeInput.value).toBe('WORLD');
		});

		it('should handle mixed case', () => {
			const inputEl = fixture.debugElement.query(By.css('#test-input'));
			const nativeInput = inputEl.nativeElement as HTMLInputElement;

			nativeInput.value = 'HeLLo WoRLd';
			inputEl.triggerEventHandler('input', { target: nativeInput });
			fixture.detectChanges();

			expect(nativeInput.value).toBe('HELLO WORLD');
		});

		it('should handle numbers and special characters', () => {
			const inputEl = fixture.debugElement.query(By.css('#test-input'));
			const nativeInput = inputEl.nativeElement as HTMLInputElement;

			nativeInput.value = 'abc123!@#';
			inputEl.triggerEventHandler('input', { target: nativeInput });
			fixture.detectChanges();

			expect(nativeInput.value).toBe('ABC123!@#');
		});

		it('should handle empty string', () => {
			const inputEl = fixture.debugElement.query(By.css('#test-input'));
			const nativeInput = inputEl.nativeElement as HTMLInputElement;

			nativeInput.value = '';
			inputEl.triggerEventHandler('input', { target: nativeInput });
			fixture.detectChanges();

			expect(nativeInput.value).toBe('');
			expect(component.testControl.value).toBe('');
		});
	});

	describe('textarea element', () => {
		it('should convert to uppercase in textarea', () => {
			const textareaEl = fixture.debugElement.query(By.css('#test-textarea'));
			const nativeTextarea = textareaEl.nativeElement as HTMLTextAreaElement;

			nativeTextarea.value = 'multiline\ntext';
			textareaEl.triggerEventHandler('input', { target: nativeTextarea });
			fixture.detectChanges();

			expect(nativeTextarea.value).toBe('MULTILINE\nTEXT');
			expect(component.textareaControl.value).toBe('MULTILINE\nTEXT');
		});
	});

	describe('form control sync', () => {
		it('should sync value with form control', () => {
			const inputEl = fixture.debugElement.query(By.css('#test-input'));
			const nativeInput = inputEl.nativeElement as HTMLInputElement;

			nativeInput.value = 'test value';
			inputEl.triggerEventHandler('input', { target: nativeInput });
			fixture.detectChanges();

			expect(component.testControl.value).toBe('TEST VALUE');
		});

		it('should set value via setValue with emitEvent false', () => {
			// The directive internally calls setValue with { emitEvent: false }
			// This prevents infinite loops when the value is programmatically set
			const inputEl = fixture.debugElement.query(By.css('#test-input'));
			const nativeInput = inputEl.nativeElement as HTMLInputElement;

			nativeInput.value = 'test';
			inputEl.triggerEventHandler('input', { target: nativeInput });

			// Value should be uppercase in both DOM and form control
			expect(nativeInput.value).toBe('TEST');
			expect(component.testControl.value).toBe('TEST');
		});
	});
});
// #endregion
