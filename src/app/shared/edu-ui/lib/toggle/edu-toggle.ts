import { ChangeDetectionStrategy, Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
	selector: 'edu-toggle',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [
		{
			provide: NG_VALUE_ACCESSOR,
			useExisting: forwardRef(() => EduToggle),
			multi: true,
		},
	],
	template: `
		<button
			type="button"
			role="switch"
			class="edu-toggle"
			[attr.aria-checked]="checked()"
			[class.edu-toggle--checked]="checked()"
			[disabled]="disabled()"
			(click)="toggle()"
		>
			<span class="edu-toggle__handle"></span>
		</button>
	`,
	styleUrl: './edu-toggle.scss',
})
export class EduToggle implements ControlValueAccessor {
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
