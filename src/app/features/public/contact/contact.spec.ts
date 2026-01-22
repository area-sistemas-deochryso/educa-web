import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { testProviders } from '@test';
import { ContactComponent } from './contact';

describe('ContactComponent', () => {
	let component: ContactComponent;
	let fixture: ComponentFixture<ContactComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [ContactComponent],
			providers: testProviders,
		}).compileComponents();

		fixture = TestBed.createComponent(ContactComponent);
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
