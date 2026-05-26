import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { SkeletonLoaderComponent } from './skeleton-loader.component';

describe('SkeletonLoaderComponent', () => {
	let fixture: ComponentFixture<SkeletonLoaderComponent>;
	let el: HTMLElement;

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [SkeletonLoaderComponent],
		});
		fixture = TestBed.createComponent(SkeletonLoaderComponent);
		el = fixture.nativeElement as HTMLElement;
	});

	it('creates', () => {
		fixture.detectChanges();
		expect(fixture.componentInstance).toBeTruthy();
	});

	it('defaults to rect variant', () => {
		fixture.detectChanges();
		const skeleton = el.querySelector('.skeleton');
		expect(skeleton?.classList.contains('skeleton--rect')).toBe(true);
	});

	it('applies text variant class', () => {
		fixture.componentRef.setInput('variant', 'text');
		fixture.detectChanges();
		const skeleton = el.querySelector('.skeleton');
		expect(skeleton?.classList.contains('skeleton--text')).toBe(true);
		expect(skeleton?.classList.contains('skeleton--rect')).toBe(false);
	});

	it('applies circle variant class', () => {
		fixture.componentRef.setInput('variant', 'circle');
		fixture.detectChanges();
		const skeleton = el.querySelector('.skeleton');
		expect(skeleton?.classList.contains('skeleton--circle')).toBe(true);
	});

	it('applies card variant class', () => {
		fixture.componentRef.setInput('variant', 'card');
		fixture.detectChanges();
		const skeleton = el.querySelector('.skeleton');
		expect(skeleton?.classList.contains('skeleton--card')).toBe(true);
	});

	it('defaults width and height to 100%', () => {
		fixture.detectChanges();
		const skeleton = el.querySelector('.skeleton') as HTMLElement;
		expect(skeleton.style.width).toBe('100%');
		expect(skeleton.style.height).toBe('100%');
	});

	it('applies custom width and height', () => {
		fixture.componentRef.setInput('width', '200px');
		fixture.componentRef.setInput('height', '50px');
		fixture.detectChanges();
		const skeleton = el.querySelector('.skeleton') as HTMLElement;
		expect(skeleton.style.width).toBe('200px');
		expect(skeleton.style.height).toBe('50px');
	});

	it('renders shimmer element', () => {
		fixture.detectChanges();
		expect(el.querySelector('.skeleton__shimmer')).not.toBeNull();
	});
});
