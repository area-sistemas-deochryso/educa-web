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
	@Input({ required: true }) control!: AbstractControl;
	@Input() customMessages?: ValidationMessageConfig;
	@Input() showOnTouched = true;

	private destroyRef = inject(DestroyRef);

	errorMessages: string[] = [];

	ngOnInit(): void {
		this.control.statusChanges
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(() => this.updateErrors());

		this.updateErrors();
	}

	get shouldShowErrors(): boolean {
		if (!this.control.errors) return false;

		if (this.showOnTouched) {
			return this.control.touched || this.control.dirty;
		}

		return true;
	}

	private updateErrors(): void {
		if (!this.control.errors) {
			this.errorMessages = [];
			return;
		}

		this.errorMessages = Object.entries(this.control.errors).map(([key, params]) =>
			getValidationMessage(key, params as Record<string, unknown>, this.customMessages),
		);
	}
}
