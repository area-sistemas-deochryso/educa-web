// #region Imports
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HttpErrorResponse } from '@angular/common/http';
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

	const VALID = { fullName: 'Ana Torres', email: 'ana@example.com', message: 'Hola' };

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
			expect(component.form().invalid()).toBe(true);
			expect(component.form.fullName().errors().map((e) => e.kind)).toContain('required');
			expect(component.form.email().errors().map((e) => e.kind)).toContain('required');
			expect(component.form.message().errors().map((e) => e.kind)).toContain('required');
		});

		it('should reject an invalid email format', () => {
			component.model.set({ ...VALID, email: 'not-an-email' });

			expect(component.form.email().errors().map((e) => e.kind)).toContain('email');
		});

		it('should be valid when all fields are filled correctly', () => {
			component.model.set({ ...VALID });

			expect(component.form().valid()).toBe(true);
		});

		it('should mark all fields as touched and not submit when invalid', async () => {
			await component.onSubmit();

			expect(contactApi.enviar).not.toHaveBeenCalled();
			expect(component.form.fullName().touched()).toBe(true);
			expect(component.form.email().touched()).toBe(true);
			expect(component.form.message().touched()).toBe(true);
		});
	});
	// #endregion

	// #region Error rendering
	describe('field error rendering', () => {
		it('should render the Spanish message and aria-invalid after a failed submit', async () => {
			await component.onSubmit();
			fixture.detectChanges();

			const input: HTMLInputElement = fixture.nativeElement.querySelector('#full-name');
			const error: HTMLElement = fixture.nativeElement.querySelector('#full-name-error');

			expect(input.getAttribute('aria-invalid')).toBe('true');
			expect(error.textContent).toContain('Ingresa tu nombre y apellido');
		});

		it('should not render errors before the field is touched', () => {
			fixture.detectChanges();

			const input: HTMLInputElement = fixture.nativeElement.querySelector('#email');
			const error: HTMLElement = fixture.nativeElement.querySelector('#email-error');

			expect(input.getAttribute('aria-invalid')).toBe('false');
			expect(error.textContent?.trim()).toBe('');
		});
	});
	// #endregion

	// #region Submit
	describe('onSubmit', () => {
		beforeEach(() => {
			component.model.set({ ...VALID });
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

			expect(component.model()).toEqual({ fullName: '', email: '', message: '' });
			expect(component.form.fullName().touched()).toBe(false);
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

	// #region ProblemDetails (ADR-0005)
	describe('server validation errors (ProblemDetails)', () => {
		beforeEach(() => {
			component.model.set({ ...VALID });
		});

		it('should map errors{} of a 422 response to the matching fields', async () => {
			contactApi.enviar.mockRejectedValue(
				new HttpErrorResponse({
					status: 422,
					error: { status: 422, errors: { Correo: ['El correo no es válido para el BE'] } },
				}),
			);

			await component.onSubmit();

			expect(component.form.email().errors().map((e) => e.message)).toContain(
				'El correo no es válido para el BE',
			);
			expect(component.submitState()).toBe('idle');
		});

		it('should fall back to the generic error when errors{} has no known field', async () => {
			contactApi.enviar.mockRejectedValue(
				new HttpErrorResponse({ status: 422, error: { errors: { Otro: ['x'] } } }),
			);

			await component.onSubmit();

			expect(component.submitState()).toBe('error');
		});

		it('should clear the server error when the user edits that field', async () => {
			contactApi.enviar.mockRejectedValue(
				new HttpErrorResponse({ status: 422, error: { errors: { Correo: ['Rechazado'] } } }),
			);
			await component.onSubmit();

			component.model.update((m) => ({ ...m, email: 'otra@example.com' }));

			expect(component.form.email().errors().map((e) => e.message)).not.toContain('Rechazado');
		});
	});
	// #endregion
});
// #endregion
