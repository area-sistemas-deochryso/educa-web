// #region Imports
import { HttpErrorResponse } from '@angular/common/http';
import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { email, form, FormField, required, submit } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { logger, parseProblemDetails } from '@core/helpers';

import { ContactApiService } from './contact-api.service';

// #endregion
// #region Implementation
type ContactSubmitState = 'idle' | 'submitting' | 'success' | 'error';

const EMPTY_CONTACT = { fullName: '', email: '', message: '' };

@Component({
	selector: 'app-contact',
	standalone: true,
	imports: [RouterLink, FormField],
	templateUrl: './contact.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
	styleUrl: './contact.scss',
})
export class ContactComponent {
	private readonly contactApi = inject(ContactApiService);

	readonly submitState = signal<ContactSubmitState>('idle');

	readonly model = signal({ ...EMPTY_CONTACT });

	readonly form = form(this.model, (path) => {
		required(path.fullName, { message: 'Ingresa tu nombre y apellido' });
		required(path.email, { message: 'Ingresa tu correo' });
		email(path.email, { message: 'Ingresa un correo válido' });
		required(path.message, { message: 'Escribe tu mensaje' });
	});

	async onSubmit(): Promise<void> {
		await submit(this.form, () => this.send());
	}

	private async send() {
		this.submitState.set('submitting');
		const { fullName, email, message } = this.model();

		try {
			await this.contactApi.enviar({
				nombreCompleto: fullName,
				correo: email,
				mensaje: message,
			});
		} catch (err) {
			logger.tagged('ContactComponent', 'error', 'Error al enviar formulario de contacto', err);
			const fieldErrors = this.serverFieldErrors(err);
			this.submitState.set(fieldErrors ? 'idle' : 'error');
			return fieldErrors;
		}

		this.submitState.set('success');
		this.form().reset({ ...EMPTY_CONTACT });
		return undefined;
	}

	// * ProblemDetails `errors{}` (ADR-0005) → errores por campo; las claves llegan con el nombre del DTO del BE.
	private serverFieldErrors(err: unknown) {
		if (!(err instanceof HttpErrorResponse)) return undefined;

		const { validationErrors } = parseProblemDetails(err);
		if (!validationErrors) return undefined;

		const targets = {
			nombrecompleto: this.form.fullName,
			correo: this.form.email,
			mensaje: this.form.message,
		};

		const fieldErrors = Object.entries(validationErrors).flatMap(([key, messages]) => {
			const name = key.toLowerCase();
			if (!(name in targets)) return [];

			const fieldTree = targets[name as keyof typeof targets];
			return messages.map((message) => ({ kind: 'server', message, fieldTree }));
		});

		return fieldErrors.length > 0 ? fieldErrors : undefined;
	}
}
// #endregion
