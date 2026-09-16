import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { testProviders } from '@test';
import { MensajeriaPageComponent } from './mensajeria-page.component';

describe('MensajeriaPageComponent', () => {
	let component: MensajeriaPageComponent;
	let fixture: ComponentFixture<MensajeriaPageComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [MensajeriaPageComponent],
			providers: testProviders,
		}).compileComponents();

		fixture = TestBed.createComponent(MensajeriaPageComponent);
		component = fixture.componentInstance;
	});

	it('should create', () => {
		fixture.componentRef.setInput('loading', false);
		fixture.componentRef.setInput('cursoOptions', []);
		fixture.detectChanges();
		expect(component).toBeTruthy();
	});

	it('should show the spinner while loading', async () => {
		fixture.componentRef.setInput('loading', true);
		fixture.componentRef.setInput('cursoOptions', []);
		fixture.detectChanges();
		await fixture.whenStable();

		expect(fixture.nativeElement.querySelector('edu-spinner')).toBeTruthy();
	});

	it('should show the empty state when there are no courses and loading is done', async () => {
		fixture.componentRef.setInput('loading', false);
		fixture.componentRef.setInput('cursoOptions', []);
		fixture.detectChanges();
		await fixture.whenStable();

		expect(fixture.nativeElement.textContent).toContain('No tienes cursos asignados');
	});

	it('should render the mensajeria tab when there are courses', async () => {
		fixture.componentRef.setInput('loading', false);
		fixture.componentRef.setInput('cursoOptions', [{ label: 'Curso A', value: 1 }]);
		fixture.detectChanges();
		await fixture.whenStable();

		expect(fixture.nativeElement.querySelector('app-salon-mensajeria-tab')).toBeTruthy();
	});
});
