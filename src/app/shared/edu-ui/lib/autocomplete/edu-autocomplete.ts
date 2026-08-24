import { FocusTrapFactory } from '@angular/cdk/a11y';
import { ConnectedPosition, Overlay } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { ChangeDetectionStrategy, Component, OnDestroy, TemplateRef, ViewContainerRef, forwardRef, inject, input, output, signal, viewChild } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { EduOverlayHandle } from '../overlay/edu-overlay-handle';
import { resolveOptionLabel, resolveOptionValue } from '../select/select-option-utils';
import { SelectListNav } from '../select/select-list-nav';

export interface EduAutoCompleteCompleteEvent {
	query: string;
}

const PANEL_POSITIONS: ConnectedPosition[] = [
	{ originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4 },
	{ originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -4 },
];

@Component({
	selector: 'edu-autocomplete',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [
		{
			provide: NG_VALUE_ACCESSOR,
			useExisting: forwardRef(() => EduAutoComplete),
			multi: true,
		},
	],
	template: `
		<input
			class="edu-input-text edu-autocomplete__input"
			type="text"
			role="combobox"
			aria-haspopup="listbox"
			[attr.aria-expanded]="isOpen()"
			[value]="query()"
			[disabled]="disabled()"
			[placeholder]="placeholder()"
			(input)="onInput($event)"
			(focus)="onFocus($event)"
			(blur)="onBlur()"
			(keydown)="onKeydown($event)"
		/>

		<ng-template #overlayTemplate>
			<div class="edu-autocomplete-panel">
				<ul class="edu-autocomplete-panel__list" role="listbox">
					@for (opt of suggestions(); track $index) {
						<li
							class="edu-autocomplete-panel__option"
							[class.edu-autocomplete-panel__option--active]="$index === activeIndex()"
							role="option"
							[attr.aria-selected]="$index === activeIndex()"
							(mousedown)="onOptionMousedown($event, opt)"
						>
							{{ resolveLabel(opt) }}
						</li>
					}
					@if (suggestions().length === 0) {
						<li class="edu-autocomplete-panel__empty" role="presentation">Sin resultados</li>
					}
				</ul>
			</div>
		</ng-template>
	`,
	styleUrl: './edu-autocomplete.scss',
})
export class EduAutoComplete implements ControlValueAccessor, OnDestroy {
	readonly suggestions = input<unknown[]>([]);
	readonly optionLabel = input<string>();
	readonly optionValue = input<string>();
	readonly placeholder = input<string>();
	readonly disabled = input(false);

	readonly completeMethod = output<EduAutoCompleteCompleteEvent>();

	protected readonly query = signal('');
	private value: unknown = null;

	private readonly overlayTemplateRef = viewChild<TemplateRef<unknown>>('overlayTemplate');
	private readonly viewContainerRef = inject(ViewContainerRef);
	private readonly overlay = inject(Overlay);
	private readonly focusTrapFactory = inject(FocusTrapFactory);
	private readonly handle = new EduOverlayHandle(this.overlay, this.focusTrapFactory);
	private readonly nav = new SelectListNav();

	protected readonly activeIndex = this.nav.activeIndex;

	private onChange: (value: unknown) => void = () => {};
	private onTouched: () => void = () => {};

	protected isOpen(): boolean {
		return this.handle.isOpen;
	}

	ngOnDestroy(): void {
		this.handle.close();
	}

	writeValue(value: unknown): void {
		this.value = value ?? null;
		const found = this.suggestions().find((opt) => resolveOptionValue(opt, this.optionValue()) === this.value);
		this.query.set(found ? this.resolveLabel(found) : this.value === null ? '' : String(this.value));
	}

	registerOnChange(fn: (value: unknown) => void): void {
		this.onChange = fn;
	}

	registerOnTouched(fn: () => void): void {
		this.onTouched = fn;
	}

	protected resolveLabel(opt: unknown): string {
		return resolveOptionLabel(opt, this.optionLabel());
	}

	protected onInput(event: Event): void {
		const raw = (event.target as HTMLInputElement).value;
		this.query.set(raw);
		this.nav.reset();
		this.completeMethod.emit({ query: raw });
		this.open(event.target as HTMLElement);
	}

	protected onFocus(event: Event): void {
		if (this.disabled()) {
			return;
		}
		this.open(event.target as HTMLElement);
	}

	protected onBlur(): void {
		this.onTouched();
		this.close();
	}

	protected onKeydown(event: KeyboardEvent): void {
		const length = this.suggestions().length;
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			if (!this.handle.isOpen && length > 0) {
				this.open(event.currentTarget as HTMLElement);
			}
			this.nav.next(length);
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			this.nav.prev();
		} else if (event.key === 'Enter') {
			const opt = this.suggestions()[this.activeIndex()];
			if (this.handle.isOpen && opt !== undefined) {
				event.preventDefault();
				this.selectOption(opt);
			}
		} else if (event.key === 'Escape') {
			this.close();
		}
	}

	protected onOptionMousedown(event: Event, opt: unknown): void {
		event.preventDefault();
		this.selectOption(opt);
	}

	private selectOption(opt: unknown): void {
		const optValue = resolveOptionValue(opt, this.optionValue());
		this.value = optValue;
		this.query.set(this.resolveLabel(opt));
		this.onChange(optValue);
		this.onTouched();
		this.close();
	}

	private close(): void {
		this.handle.close();
		this.nav.reset();
	}

	private open(trigger: HTMLElement): void {
		const overlayTemplate = this.overlayTemplateRef();
		if (!overlayTemplate || this.handle.isOpen) {
			return;
		}

		const portal = new TemplatePortal(overlayTemplate, this.viewContainerRef);
		const positionStrategy = this.overlay
			.position()
			.flexibleConnectedTo(trigger)
			.withPositions(PANEL_POSITIONS)
			.withFlexibleDimensions(false)
			.withPush(true);

		this.handle.open(
			portal,
			{
				positionStrategy,
				panelClass: 'edu-autocomplete-pane',
				hasBackdrop: false,
				closeOnBackdropClick: false,
			},
			() => this.close(),
		);
	}
}
