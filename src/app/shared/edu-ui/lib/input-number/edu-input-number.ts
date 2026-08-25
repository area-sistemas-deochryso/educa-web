import { ChangeDetectionStrategy, Component, forwardRef, input, output, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

const LOCALE_PARTS = new Intl.NumberFormat(undefined, { useGrouping: true }).formatToParts(1234.5);
const GROUP_CHAR = LOCALE_PARTS.find((p) => p.type === 'group')?.value ?? ',';
const DECIMAL_CHAR = LOCALE_PARTS.find((p) => p.type === 'decimal')?.value ?? '.';

export interface EduInputNumberInputEvent {
	originalEvent: Event;
	value: number | null;
	formattedValue: string;
}

@Component({
	selector: 'edu-input-number',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [
		{
			provide: NG_VALUE_ACCESSOR,
			useExisting: forwardRef(() => EduInputNumber),
			multi: true,
		},
	],
	template: `
		<div class="edu-input-number" [class.edu-input-number--buttons]="showButtons()" [style]="style()">
			<input
				class="edu-input-text edu-input-number__input"
				type="text"
				inputmode="decimal"
				[value]="text()"
				[disabled]="disabled()"
				[placeholder]="placeholder()"
				[style]="inputStyle()"
				(input)="handleInput($event)"
				(blur)="handleBlur($event)"
				(keydown.ArrowUp)="onArrowStep($event, 1)"
				(keydown.ArrowDown)="onArrowStep($event, -1)"
			/>
			@if (showButtons()) {
				<div class="edu-input-number__buttons">
					<button type="button" class="edu-input-number__button" tabindex="-1" [disabled]="disabled()" (click)="applyStep(1)">
						<i class="pi pi-angle-up"></i>
					</button>
					<button type="button" class="edu-input-number__button" tabindex="-1" [disabled]="disabled()" (click)="applyStep(-1)">
						<i class="pi pi-angle-down"></i>
					</button>
				</div>
			}
		</div>
	`,
	styleUrl: './edu-input-number.scss',
})
export class EduInputNumber implements ControlValueAccessor {
	readonly min = input<number>();
	readonly max = input<number>();
	readonly step = input(1);
	readonly minFractionDigits = input<number>();
	readonly maxFractionDigits = input<number>();
	readonly useGrouping = input(true);
	readonly showButtons = input(false);
	readonly disabled = input(false);
	readonly placeholder = input<string>();
	readonly style = input<Record<string, string> | null>(null);
	readonly inputStyle = input<Record<string, string> | null>(null);

	/** Emits the raw (pre-clamp) value on every keystroke — mirrors PrimeNG's `(onInput)`, which fires before `(onBlur)` clamps to `min`/`max`. */
	readonly onInput = output<EduInputNumberInputEvent>();
	readonly onBlur = output<FocusEvent>();

	protected readonly text = signal('');

	private value: number | null = null;
	private onChange: (value: number | null) => void = () => {};
	private onTouched: () => void = () => {};

	writeValue(value: number | null): void {
		this.value = value ?? null;
		this.text.set(this.format(this.value));
	}

	registerOnChange(fn: (value: number | null) => void): void {
		this.onChange = fn;
	}

	registerOnTouched(fn: () => void): void {
		this.onTouched = fn;
	}

	protected handleInput(event: Event): void {
		const raw = (event.target as HTMLInputElement).value;
		this.text.set(raw);
		this.value = this.parse(raw);
		this.onChange(this.value);
		this.onInput.emit({ originalEvent: event, value: this.value, formattedValue: raw });
	}

	protected handleBlur(event: FocusEvent): void {
		this.value = this.clamp(this.value);
		this.text.set(this.format(this.value));
		this.onChange(this.value);
		this.onTouched();
		this.onBlur.emit(event);
	}

	protected onArrowStep(event: Event, direction: 1 | -1): void {
		event.preventDefault();
		this.applyStep(direction);
	}

	protected applyStep(direction: 1 | -1): void {
		if (this.disabled()) {
			return;
		}
		const base = this.value ?? 0;
		this.value = this.clamp(base + direction * this.step());
		this.text.set(this.format(this.value));
		this.onChange(this.value);
		this.onTouched();
	}

	private clamp(value: number | null): number | null {
		if (value === null) {
			return value;
		}
		const min = this.min();
		const max = this.max();
		let clamped = value;
		if (min !== undefined) {
			clamped = Math.max(min, clamped);
		}
		if (max !== undefined) {
			clamped = Math.min(max, clamped);
		}
		return clamped;
	}

	private format(value: number | null): string {
		if (value === null) {
			return '';
		}
		return new Intl.NumberFormat(undefined, {
			useGrouping: this.useGrouping(),
			minimumFractionDigits: this.minFractionDigits(),
			maximumFractionDigits: this.maxFractionDigits(),
		}).format(value);
	}

	private parse(text: string): number | null {
		if (!text.trim()) {
			return null;
		}
		const cleaned = text.split(GROUP_CHAR).join('').split(DECIMAL_CHAR).join('.');
		const parsed = parseFloat(cleaned);
		return isNaN(parsed) ? null : parsed;
	}
}
