// #region Imports
import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { logger } from '@core/helpers';

import { ContactApiService } from './contact-api.service';

// #endregion
// #region Implementation
type ContactSubmitState = 'idle' | 'submitting' | 'success' | 'error';

@Component({
	selector: 'app-contact',
	standalone: true,
	imports: [RouterLink, ReactiveFormsModule],
	templateUrl: './contact.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
	styleUrl: './contact.scss',
})
export class ContactComponent {
	private readonly fb = inject(FormBuilder);
	private readonly contactApi = inject(ContactApiService);

	readonly submitState = signal<ContactSubmitState>('idle');

	readonly form = this.fb.nonNullable.group({
		fullName: ['', Validators.required],
		email: ['', [Validators.required, Validators.email]],
		message: ['', Validators.required],
	});

	async onSubmit(): Promise<void> {
		if (this.form.invalid || this.submitState() === 'submitting') {
			this.form.markAllAsTouched();
			return;
		}

		this.submitState.set('submitting');
		const { fullName, email, message } = this.form.getRawValue();

		try {
			await this.contactApi.enviar({
				nombreCompleto: fullName,
				correo: email,
				mensaje: message,
			});
			this.submitState.set('success');
			this.form.reset();
		} catch (err) {
			logger.tagged('ContactComponent', 'error', 'Error al enviar formulario de contacto', err);
			this.submitState.set('error');
		}
	}
}
// #endregion
