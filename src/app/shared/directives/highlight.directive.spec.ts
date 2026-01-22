import { Component, DebugElement } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { describe, it, expect, beforeEach } from 'vitest';

import { HighlightDirective } from './highlight.directive';

@Component({
	standalone: true,
	imports: [HighlightDirective],
	template: `
		<p id="default" appHighlight>Default highlight</p>
		<p id="custom" [appHighlight]="'#ff0000'">Custom color highlight</p>
		<p id="no-directive">No directive</p>
	`,
})
class TestHostComponent {}

describe('HighlightDirective', () => {
	let fixture: ComponentFixture<TestHostComponent>;
	let defaultEl: DebugElement;
	let customEl: DebugElement;
	let noDirectiveEl: DebugElement;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [TestHostComponent],
		}).compileComponents();

		fixture = TestBed.createComponent(TestHostComponent);
		fixture.detectChanges();

		defaultEl = fixture.debugElement.query(By.css('#default'));
		customEl = fixture.debugElement.query(By.css('#custom'));
		noDirectiveEl = fixture.debugElement.query(By.css('#no-directive'));
	});

	it('should create instances', () => {
		expect(defaultEl).toBeTruthy();
		expect(customEl).toBeTruthy();
	});

	describe('mouseenter event', () => {
		it('should set default background color on mouseenter', () => {
			defaultEl.triggerEventHandler('mouseenter', null);
			fixture.detectChanges();

			expect(defaultEl.nativeElement.style.backgroundColor).toBe('rgb(255, 235, 59)'); // #ffeb3b
		});

		it('should set custom background color on mouseenter', () => {
			customEl.triggerEventHandler('mouseenter', null);
			fixture.detectChanges();

			expect(customEl.nativeElement.style.backgroundColor).toBe('rgb(255, 0, 0)'); // #ff0000
		});
	});

	describe('mouseleave event', () => {
		it('should remove background color on mouseleave', () => {
			// First trigger mouseenter
			defaultEl.triggerEventHandler('mouseenter', null);
			fixture.detectChanges();
			expect(defaultEl.nativeElement.style.backgroundColor).toBeTruthy();

			// Then trigger mouseleave
			defaultEl.triggerEventHandler('mouseleave', null);
			fixture.detectChanges();

			expect(defaultEl.nativeElement.style.backgroundColor).toBe('');
		});
	});

	describe('element without directive', () => {
		it('should not have highlight behavior', () => {
			const initialBg = noDirectiveEl.nativeElement.style.backgroundColor;

			// Simulate mouseenter - should not change
			noDirectiveEl.nativeElement.dispatchEvent(new MouseEvent('mouseenter'));
			fixture.detectChanges();

			expect(noDirectiveEl.nativeElement.style.backgroundColor).toBe(initialBg);
		});
	});
});
