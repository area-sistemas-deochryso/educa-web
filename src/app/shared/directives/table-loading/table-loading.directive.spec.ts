import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { By } from '@angular/platform-browser';
import { Component } from '@angular/core';
import { TableLoadingDirective } from './table-loading.directive';

@Component({
	standalone: true,
	imports: [TableLoadingDirective],
	template: `
		<section
			id="table-section"
			appTableLoading
			[loading]="loading"
			[minHeightPx]="minHeightPx"
			[freezeHeight]="freezeHeight"
			[blurPx]="blurPx"
		>
			<div id="content">Contenido</div>
		</section>
	`,
})
class TestHostComponent {
	loading = false;
	minHeightPx = 320;
	freezeHeight = true;
	blurPx = 2;
}

describe('TableLoadingDirective', () => {
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

	it('should append overlay element to host', () => {
		const host = fixture.debugElement.query(By.css('#table-section'))
			.nativeElement as HTMLElement;
		const overlay = host.querySelector('.table-loading__overlay');

		expect(overlay).toBeTruthy();
	});

	it('should activate loading styles and aria-busy when loading=true', () => {
		component.loading = true;
		fixture.detectChanges();

		const host = fixture.debugElement.query(By.css('#table-section'))
			.nativeElement as HTMLElement;
		const overlay = host.querySelector('.table-loading__overlay') as HTMLElement;

		expect(host.classList.contains('table-loading--active')).toBe(true);
		expect(host.getAttribute('aria-busy')).toBe('true');
		expect(overlay.style.display).toBe('grid');
	});

	it('should deactivate loading styles and remove aria-busy when loading=false', () => {
		// enable first
		component.loading = true;
		fixture.detectChanges();

		// then disable
		component.loading = false;
		fixture.detectChanges();

		const host = fixture.debugElement.query(By.css('#table-section'))
			.nativeElement as HTMLElement;
		const overlay = host.querySelector('.table-loading__overlay') as HTMLElement;

		expect(host.classList.contains('table-loading--active')).toBe(false);
		expect(host.getAttribute('aria-busy')).toBeNull();
		expect(overlay.style.display).toBe('none');
	});

	it('should set position: relative on host when it is static and loading becomes true', () => {
		const host = fixture.debugElement.query(By.css('#table-section'))
			.nativeElement as HTMLElement;

		// JSDOM default is typically empty -> treated as static for our directive
		component.loading = true;
		fixture.detectChanges();

		expect(host.style.position).toBe('relative');
	});

	it('should set CSS blur variable when loading=true', () => {
		component.blurPx = 6;
		component.loading = true;
		fixture.detectChanges();

		const host = fixture.debugElement.query(By.css('#table-section'))
			.nativeElement as HTMLElement;
		expect(host.style.getPropertyValue('--table-loading-blur')).toBe('6px');
	});

	it('should set min-height at least minHeightPx when freezeHeight=true and loading=true', () => {
		component.freezeHeight = true;
		component.minHeightPx = 420;
		component.loading = true;
		fixture.detectChanges();

		const host = fixture.debugElement.query(By.css('#table-section'))
			.nativeElement as HTMLElement;
		// We can’t rely on layout measurement in JSDOM, but we can assert it sets the style.
		expect(host.style.minHeight).toBe('420px');
	});

	it('should not set min-height when freezeHeight=false', () => {
		component.freezeHeight = false;
		component.minHeightPx = 420;
		component.loading = true;
		fixture.detectChanges();

		const host = fixture.debugElement.query(By.css('#table-section'))
			.nativeElement as HTMLElement;
		expect(host.style.minHeight).toBe('');
	});
});
