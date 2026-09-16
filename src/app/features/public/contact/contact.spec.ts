// #region Imports
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { testProviders } from '@test';
import { ContactComponent } from './contact';
import { ContactApiService } from './contact-api.service';

// #endregion
// #region Implementation
describe('ContactComponent', () => {
	let component: ContactComponent;
	let fixture: ComponentFixture<ContactComponent>;
	let contactApi: { enviar: ReturnType<typeof vi.fn> };

	beforeEach(async () => {
		contactApi = { enviar: vi.fn().mockResolvedValue(undefined) };

		await TestBed.configureTestingModule({
			imports: [ContactComponent],
			providers: [...testProviders, { provide: ContactApiService, useValue: contactApi }],
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

	// #region Field validation
	describe('field validation', () => {
		it('should require fullName, email and message', () => {
			expect(component.form.invalid).toBe(true);
			expect(component.form.controls.fullName.hasError('required')).toBe(true);
			expect(component.form.controls.email.hasError('required')).toBe(true);
			expect(component.form.controls.message.hasError('required')).toBe(true);
		});

		it('should reject an invalid email format', () => {
			component.form.controls.email.setValue('not-an-email');

			expect(component.form.controls.email.hasError('email')).toBe(true);
		});

		it('should be valid when all fields are filled correctly', () => {
			component.form.setValue({ fullName: 'Ana Torres', email: 'ana@example.com', message: 'Hola' });

			expect(component.form.valid).toBe(true);
		});

		it('should mark all fields as touched and not submit when invalid', async () => {
			await component.onSubmit();

			expect(contactApi.enviar).not.toHaveBeenCalled();
			expect(component.form.controls.fullName.touched).toBe(true);
			expect(component.form.controls.email.touched).toBe(true);
			expect(component.form.controls.message.touched).toBe(true);
		});
	});
	// #endregion

	// #region Submit
	describe('onSubmit', () => {
		beforeEach(() => {
			component.form.setValue({ fullName: 'Ana Torres', email: 'ana@example.com', message: 'Hola' });
		});

		it('should send the payload and set success state on success', async () => {
			await component.onSubmit();

			expect(contactApi.enviar).toHaveBeenCalledWith({
				nombreCompleto: 'Ana Torres',
				correo: 'ana@example.com',
				mensaje: 'Hola',
			});
			expect(component.submitState()).toBe('success');
		});

		it('should reset the form after a successful submit', async () => {
			await component.onSubmit();

			expect(component.form.controls.fullName.value).toBe('');
			expect(component.form.controls.email.value).toBe('');
			expect(component.form.controls.message.value).toBe('');
		});

		it('should set error state when the API call fails', async () => {
			contactApi.enviar.mockRejectedValue(new Error('network error'));

			await component.onSubmit();

			expect(component.submitState()).toBe('error');
		});

		it('should not resubmit while already submitting', async () => {
			let resolveEnviar!: () => void;
			contactApi.enviar.mockReturnValue(new Promise<void>((resolve) => { resolveEnviar = resolve; }));

			const first = component.onSubmit();
			expect(component.submitState()).toBe('submitting');

			await component.onSubmit();
			expect(contactApi.enviar).toHaveBeenCalledTimes(1);

			resolveEnviar();
			await first;
		});

		it('should disable the submit button while submitting', async () => {
			let resolveEnviar!: () => void;
			contactApi.enviar.mockReturnValue(new Promise<void>((resolve) => { resolveEnviar = resolve; }));

			const pending = component.onSubmit();
			fixture.detectChanges();

			const button: HTMLButtonElement = fixture.nativeElement.querySelector('button[type="submit"]');
			expect(button.disabled).toBe(true);

			resolveEnviar();
			await pending;
			fixture.detectChanges();

			expect(button.disabled).toBe(false);
		});

		it('should render the error alert message in the template on error', async () => {
			contactApi.enviar.mockRejectedValue(new Error('network error'));

			await component.onSubmit();
			fixture.detectChanges();

			const alert: HTMLElement = fixture.nativeElement.querySelector('.alert-danger');
			expect(alert).toBeTruthy();
			expect(alert.textContent).toContain('No pudimos enviar tu mensaje');
		});
	});
	// #endregion
});
// #endregion
