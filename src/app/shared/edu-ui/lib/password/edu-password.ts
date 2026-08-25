import { ChangeDetectionStrategy, Component, computed, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export type EduPasswordStrength = 'weak' | 'medium' | 'strong' | null;

function scoreStrength(value: string): EduPasswordStrength {
	if (!value) {
		return null;
	}
	let score = 0;
	if (value.length >= 8) {
		score++;
	}
	if (/[a-z]/.test(value) && /[A-Z]/.test(value)) {
		score++;
	}
	if (/[0-9]/.test(value)) {
		score++;
	}
	if (/[^A-Za-z0-9]/.test(value)) {
		score++;
	}
	if (score <= 1) {
		return 'weak';
	}
	return score <= 3 ? 'medium' : 'strong';
}

@Component({
	selector: 'edu-password',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [
		{
			provide: NG_VALUE_ACCESSOR,
			useExisting: forwardRef(() => EduPassword),
			multi: true,
		},
	],
	template: `
		<div class="edu-password" [class.edu-password--fluid]="fluid()" [style]="style()">
			<input
				class="edu-input-text edu-password__input"
				[class.edu-password__input--mask]="toggleMask()"
				[type]="masked() ? 'password' : 'text'"
				[value]="value()"
				[disabled]="disabled()"
				[placeholder]="placeholder()"
				[style]="inputStyle()"
				(input)="onInput($event)"
				(focus)="onFocus()"
				(blur)="onBlur()"
			/>
			@if (toggleMask()) {
				<button type="button" class="edu-password__toggle" tabindex="-1" [disabled]="disabled()" (click)="masked.set(!masked())">
					<i [class]="masked() ? 'pi pi-eye' : 'pi pi-eye-slash'"></i>
				</button>
			}
			@if (feedback() && showFeedback()) {
				<div class="edu-password__feedback">
					<div class="edu-password__meter" [attr.data-strength]="strength()"></div>
					<span class="edu-password__hint">{{ strength() ?? 'weak' }}</span>
				</div>
			}
		</div>
	`,
	styleUrl: './edu-password.scss',
})
export class EduPassword implements ControlValueAccessor {
	readonly toggleMask = input(false);
	readonly feedback = input(false);
	readonly disabled = input(false);
	readonly placeholder = input<string>();
	readonly fluid = input(false);
	readonly style = input<Record<string, string> | null>(null);
	readonly inputStyle = input<Record<string, string> | null>(null);

	protected readonly value = signal('');
	protected readonly masked = signal(true);
	protected readonly showFeedback = signal(false);
	protected readonly strength = computed(() => scoreStrength(this.value()));

	private onChange: (value: string) => void = () => {};
	private onTouched: () => void = () => {};

	writeValue(value: string): void {
		this.value.set(value ?? '');
	}

	registerOnChange(fn: (value: string) => void): void {
		this.onChange = fn;
	}

	registerOnTouched(fn: () => void): void {
		this.onTouched = fn;
	}

	protected onInput(event: Event): void {
		const raw = (event.target as HTMLInputElement).value;
		this.value.set(raw);
		this.onChange(raw);
	}

	protected onFocus(): void {
		this.showFeedback.set(true);
	}

	protected onBlur(): void {
		this.showFeedback.set(false);
		this.onTouched();
	}
}
