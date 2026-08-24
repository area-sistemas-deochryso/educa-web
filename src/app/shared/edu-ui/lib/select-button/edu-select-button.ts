import { ChangeDetectionStrategy, Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
	selector: 'edu-select-button',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [
		{
			provide: NG_VALUE_ACCESSOR,
			useExisting: forwardRef(() => EduSelectButton),
			multi: true,
		},
	],
	template: `
		<div class="edu-select-button" role="group" [class.edu-select-button--disabled]="disabled()">
			@for (opt of options(); track $index) {
				<button
					type="button"
					class="edu-select-button__option"
					[class.edu-select-button__option--selected]="isSelected(opt)"
					[disabled]="disabled()"
					(click)="select(opt)"
				>
					<span class="edu-select-button__label">{{ getOptionLabel(opt) }}</span>
				</button>
			}
		</div>
	`,
	styleUrl: './edu-select-button.scss',
})
export class EduSelectButton implements ControlValueAccessor {
	readonly options = input<unknown[]>([]);
	readonly optionLabel = input<string>();
	readonly optionValue = input<string>();
	readonly allowEmpty = input(true);
	readonly disabled = input(false);

	protected readonly value = signal<unknown>(null);

	private onChange: (value: unknown) => void = () => {};
	private onTouched: () => void = () => {};

	writeValue(value: unknown): void {
		this.value.set(value);
	}

	registerOnChange(fn: (value: unknown) => void): void {
		this.onChange = fn;
	}

	registerOnTouched(fn: () => void): void {
		this.onTouched = fn;
	}

	protected getOptionLabel(opt: unknown): unknown {
		const key = this.optionLabel();
		return key && typeof opt === 'object' && opt !== null ? (opt as Record<string, unknown>)[key] : opt;
	}

	protected getOptionValue(opt: unknown): unknown {
		const key = this.optionValue();
		return key && typeof opt === 'object' && opt !== null ? (opt as Record<string, unknown>)[key] : opt;
	}

	protected isSelected(opt: unknown): boolean {
		return this.getOptionValue(opt) === this.value();
	}

	protected select(opt: unknown): void {
		if (this.disabled()) {
			return;
		}
		if (this.isSelected(opt)) {
			if (this.allowEmpty()) {
				this.value.set(null);
				this.onChange(null);
			}
		} else {
			const optValue = this.getOptionValue(opt);
			this.value.set(optValue);
			this.onChange(optValue);
		}
		this.onTouched();
	}
}
