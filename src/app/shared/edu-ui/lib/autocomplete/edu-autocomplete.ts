import { NgTemplateOutlet } from '@angular/common';
import { FocusTrapFactory } from '@angular/cdk/a11y';
import { ConnectedPosition, Overlay } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import {
	ChangeDetectionStrategy,
	Component,
	OnDestroy,
	TemplateRef,
	ViewContainerRef,
	computed,
	contentChild,
	contentChildren,
	forwardRef,
	inject,
	input,
	output,
	signal,
	viewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { EduOverlayHandle } from '../overlay/edu-overlay-handle';
import { resolveOptionLabel, resolveOptionValue } from '../select/select-option-utils';
import { SelectListNav } from '../select/select-list-nav';
import { EduTemplate } from '../table/edu-template';
import { EduPassThrough, EduPtRoot } from '../passthrough/edu-pt-root';

export interface EduAutoCompleteCompleteEvent {
	query: string;
}

export interface EduAutoCompleteSelectEvent<T = unknown> {
	originalEvent: Event;
	value: T;
}

const PANEL_POSITIONS: ConnectedPosition[] = [
	{ originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4 },
	{ originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -4 },
];

@Component({
	selector: 'edu-autocomplete',
	standalone: true,
	imports: [NgTemplateOutlet, EduPtRoot],
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [
		{
			provide: NG_VALUE_ACCESSOR,
			useExisting: forwardRef(() => EduAutoComplete),
			multi: true,
		},
	],
	template: `
		<span class="edu-autocomplete" [style]="style()" [eduPtRoot]="pt()?.root">
			<input
				class="edu-input-text edu-autocomplete__input"
				[class.edu-autocomplete__input--with-dropdown]="dropdown()"
				type="text"
				role="combobox"
				aria-haspopup="listbox"
				[attr.aria-expanded]="isOpen()"
				[attr.maxlength]="maxlength()"
				[value]="query()"
				[disabled]="disabled()"
				[placeholder]="placeholder()"
				[style]="inputStyle()"
				(input)="onInput($event)"
				(focus)="onFocus($event)"
				(blur)="onInputBlur()"
				(keydown)="onKeydown($event)"
			/>
			@if (dropdown()) {
				<button type="button" class="edu-autocomplete__dropdown" tabindex="-1" [disabled]="disabled()" (mousedown)="onDropdownMousedown($event)">
					<i class="pi pi-chevron-down"></i>
				</button>
			}
		</span>

		<ng-template #overlayTemplate>
			<div class="edu-autocomplete-panel" [style]="panelStyle()">
				<ul class="edu-autocomplete-panel__list" role="listbox">
					@for (opt of suggestions(); track $index) {
						<li
							class="edu-autocomplete-panel__option"
							[class.edu-autocomplete-panel__option--active]="$index === activeIndex()"
							role="option"
							[attr.aria-selected]="$index === activeIndex()"
							(mousedown)="onOptionMousedown($event, opt)"
						>
							@if (itemTemplate(); as tpl) {
								<ng-container [ngTemplateOutlet]="tpl" [ngTemplateOutletContext]="{ $implicit: opt }"></ng-container>
							} @else {
								{{ resolveLabel(opt) }}
							}
						</li>
					}
					@if (suggestions().length === 0 && showEmptyMessage()) {
						<li class="edu-autocomplete-panel__empty" role="presentation">
							@if (emptyTemplate(); as tpl) {
								<ng-container [ngTemplateOutlet]="tpl"></ng-container>
							} @else {
								{{ emptyMessage() }}
							}
						</li>
					}
				</ul>
			</div>
		</ng-template>
	`,
	styleUrl: './edu-autocomplete.scss',
})
export class EduAutoComplete<T = unknown> implements ControlValueAccessor, OnDestroy {
	readonly suggestions = input<T[]>([]);
	readonly optionLabel = input<string>();
	readonly optionValue = input<string>();
	readonly placeholder = input<string>();
	readonly disabled = input(false);
	readonly minLength = input(1);
	/** Debounce (ms) before `completeMethod` fires after a keystroke — matches PrimeNG's `delay`. */
	readonly delay = input(0);
	readonly maxlength = input<number>();
	readonly dropdown = input(false);
	readonly forceSelection = input(false);
	readonly showEmptyMessage = input(true);
	readonly emptyMessage = input('Sin resultados');
	readonly style = input<Record<string, string> | null>(null);
	readonly inputStyle = input<Record<string, string> | null>(null);
	readonly panelStyle = input<Record<string, string> | null>(null);
	readonly pt = input<EduPassThrough>();

	readonly completeMethod = output<EduAutoCompleteCompleteEvent>();
	readonly onSelect = output<EduAutoCompleteSelectEvent<T>>();
	readonly onShow = output<void>();
	readonly onHide = output<void>();

	protected readonly query = signal('');
	private value: T | null = null;
	private delayTimer: ReturnType<typeof setTimeout> | null = null;

	private readonly itemTemplateRef = contentChild<TemplateRef<unknown>>('item');
	private readonly emptyTemplateRef = contentChild<TemplateRef<unknown>>('empty');
	private readonly legacyTemplates = contentChildren(EduTemplate);

	protected readonly itemTemplate = computed(() => this.itemTemplateRef() ?? this.legacyTemplate('item'));
	protected readonly emptyTemplate = computed(() => this.emptyTemplateRef() ?? this.legacyTemplate('empty'));

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
		if (this.delayTimer) clearTimeout(this.delayTimer);
	}

	writeValue(value: T | null): void {
		this.value = value ?? null;
		const found = this.suggestions().find((opt) => resolveOptionValue(opt, this.optionValue()) === (this.value as unknown));
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

		if (!this.forceSelection()) {
			this.value = raw as unknown as T;
			this.onChange(raw);
		}

		if (raw.length < this.minLength()) {
			return;
		}

		if (this.delayTimer) clearTimeout(this.delayTimer);
		const fire = () => {
			this.completeMethod.emit({ query: raw });
			this.open(event.target as HTMLElement);
		};
		if (this.delay() > 0) {
			this.delayTimer = setTimeout(fire, this.delay());
		} else {
			fire();
		}
	}

	protected onFocus(event: Event): void {
		if (this.disabled()) {
			return;
		}
		if (this.query().length >= this.minLength()) {
			this.open(event.target as HTMLElement);
		}
	}

	protected onInputBlur(): void {
		this.onTouched();
		if (this.forceSelection() && !this.hasMatchingSuggestion()) {
			this.query.set('');
			this.value = null;
			this.onChange(null);
		}
		this.close();
	}

	protected onDropdownMousedown(event: Event): void {
		event.preventDefault();
		if (this.disabled()) return;
		if (this.handle.isOpen) {
			this.close();
		} else {
			this.completeMethod.emit({ query: this.query() });
			this.open(event.currentTarget as HTMLElement);
		}
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
				this.selectOption(opt, event);
			}
		} else if (event.key === 'Escape') {
			this.close();
		}
	}

	protected onOptionMousedown(event: Event, opt: T): void {
		event.preventDefault();
		this.selectOption(opt, event);
	}

	private hasMatchingSuggestion(): boolean {
		return this.suggestions().some((opt) => this.resolveLabel(opt) === this.query());
	}

	private selectOption(opt: T, originalEvent: Event): void {
		const optValue = resolveOptionValue(opt, this.optionValue()) as T;
		this.value = optValue;
		this.query.set(this.resolveLabel(opt));
		this.onChange(optValue);
		this.onTouched();
		this.onSelect.emit({ originalEvent, value: optValue });
		this.close();
	}

	private legacyTemplate(name: string): TemplateRef<unknown> | undefined {
		return this.legacyTemplates().find((template) => template.pTemplate() === name)?.templateRef;
	}

	private close(): void {
		if (this.handle.isOpen) {
			this.handle.close();
			this.onHide.emit();
		}
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
		this.onShow.emit();
	}
}
