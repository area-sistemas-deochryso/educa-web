import { ChangeDetectionStrategy, Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
	selector: 'edu-checkbox',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [
		{
			provide: NG_VALUE_ACCESSOR,
			useExisting: forwardRef(() => EduCheckbox),
			multi: true,
		},
	],
	template: `
		<label class="edu-checkbox" [class.edu-checkbox--disabled]="disabled()">
			<button
				type="button"
				role="checkbox"
				class="edu-checkbox__box"
				[attr.aria-checked]="checked()"
				[class.edu-checkbox__box--checked]="checked()"
				[disabled]="disabled()"
				(click)="toggle()"
			>
				@if (checked()) {
					<svg class="edu-checkbox__icon" viewBox="0 0 14 14" fill="none">
						<path d="M2 7L5.5 10.5L12 3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
					</svg>
				}
			</button>
			@if (label()) {
				<span class="edu-checkbox__label">{{ label() }}</span>
			}
		</label>
	`,
	styleUrl: './edu-checkbox.scss',
})
export class EduCheckbox implements ControlValueAccessor {
	readonly label = input<string>();
	readonly disabled = input(false);

	protected readonly checked = signal(false);

	private onChange: (value: boolean) => void = () => {};
	private onTouched: () => void = () => {};

	writeValue(value: boolean): void {
		this.checked.set(!!value);
	}

	registerOnChange(fn: (value: boolean) => void): void {
		this.onChange = fn;
	}

	registerOnTouched(fn: () => void): void {
		this.onTouched = fn;
	}

	toggle(): void {
		if (this.disabled()) {
			return;
		}
		this.checked.set(!this.checked());
		this.onChange(this.checked());
		this.onTouched();
	}
}
