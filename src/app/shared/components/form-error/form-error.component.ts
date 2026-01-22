import { Component, Input, inject, OnInit, DestroyRef } from '@angular/core'
import { CommonModule } from '@angular/common'
import { AbstractControl } from '@angular/forms'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { getValidationMessage, ValidationMessageConfig } from '@shared/validators'

@Component({
	selector: 'app-form-error',
	standalone: true,
	imports: [CommonModule],
	template: `
		@if (shouldShowErrors) {
			<div class="form-error">
				@for (message of errorMessages; track message) {
					<small class="p-error">{{ message }}</small>
				}
			</div>
		}
	`,
	styles: [
		`
			.form-error {
				display: flex;
				flex-direction: column;
				gap: 0.25rem;
				margin-top: 0.25rem;
			}
			.p-error {
				font-size: 0.75rem;
				color: var(--red-500);
			}
		`,
	],
})
export class FormErrorComponent implements OnInit {
	@Input({ required: true }) control!: AbstractControl
	@Input() customMessages?: ValidationMessageConfig
	@Input() showOnTouched = true

	private destroyRef = inject(DestroyRef)

	errorMessages: string[] = []

	ngOnInit(): void {
		this.control.statusChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.updateErrors())

		this.updateErrors()
	}

	get shouldShowErrors(): boolean {
		if (!this.control.errors) return false

		if (this.showOnTouched) {
			return this.control.touched || this.control.dirty
		}

		return true
	}

	private updateErrors(): void {
		if (!this.control.errors) {
			this.errorMessages = []
			return
		}

		this.errorMessages = Object.entries(this.control.errors).map(([key, params]) =>
			getValidationMessage(key, params as Record<string, unknown>, this.customMessages)
		)
	}
}
