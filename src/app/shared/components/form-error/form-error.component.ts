import { Component, DestroyRef, Input, OnInit, inject } from '@angular/core';
import { ValidationMessageConfig, getValidationMessage } from '@shared/validators';

import { AbstractControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
	selector: 'app-form-error',
	standalone: true,
	imports: [CommonModule],
	templateUrl: './form-error.component.html',
	styleUrls: ['./form-error.component.scss'],
})
export class FormErrorComponent implements OnInit {
	// * Reactive form control to inspect for errors.
	@Input({ required: true }) control!: AbstractControl;
	// * Optional override map for validation messages.
	@Input() customMessages?: ValidationMessageConfig;
	// * Gate showing errors until user interacts.
	@Input() showOnTouched = true;

	private destroyRef = inject(DestroyRef);

	// * Current list of translated messages for the template.
	errorMessages: string[] = [];

	ngOnInit(): void {
		// * Keep errors in sync with status changes.
		this.control.statusChanges
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(() => this.updateErrors());

		this.updateErrors();
	}

	get shouldShowErrors(): boolean {
		// * Avoid rendering when there is no errors object.
		if (!this.control.errors) return false;

		if (this.showOnTouched) {
			return this.control.touched || this.control.dirty;
		}

		return true;
	}

	private updateErrors(): void {
		// * Map validation keys to displayable messages.
		if (!this.control.errors) {
			this.errorMessages = [];
			return;
		}

		this.errorMessages = Object.entries(this.control.errors).map(([key, params]) =>
			getValidationMessage(key, params as Record<string, unknown>, this.customMessages),
		);
	}
}
