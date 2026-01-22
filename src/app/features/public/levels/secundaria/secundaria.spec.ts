import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { testProviders } from '@test';
import { SecundariaComponent } from './secundaria';

describe('SecundariaComponent', () => {
	let component: SecundariaComponent;
	let fixture: ComponentFixture<SecundariaComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [SecundariaComponent],
			providers: testProviders,
		}).compileComponents();

		fixture = TestBed.createComponent(SecundariaComponent);
		component = fixture.componentInstance;
		await fixture.whenStable();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should render without errors', () => {
		expect(fixture.nativeElement).toBeTruthy();
	});
});
