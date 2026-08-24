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
	forwardRef,
	inject,
	input,
	signal,
	viewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { EduOverlayHandle } from '../overlay/edu-overlay-handle';
import { filterOptionsByLabel, resolveOptionLabel, resolveOptionValue } from '../select/select-option-utils';
import { SelectListNav } from '../select/select-list-nav';
import { EduPassThrough, EduPtRoot } from '../passthrough/edu-pt-root';
import { EduSpinner } from '../spinner/edu-spinner';

interface EduMultiSelectGroup {
	label: string;
	children: unknown[];
}

export type EduMultiSelectDisplay = 'chip' | 'comma';

const PANEL_POSITIONS: ConnectedPosition[] = [
	{ originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4 },
	{ originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -4 },
];

@Component({
	selector: 'edu-multi-select',
	standalone: true,
	imports: [EduPtRoot, EduSpinner],
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [
		{
			provide: NG_VALUE_ACCESSOR,
			useExisting: forwardRef(() => EduMultiSelect),
			multi: true,
		},
	],
	template: `
		<div
			class="edu-multi-select"
			[class.edu-multi-select--disabled]="disabled()"
			[class]="styleClass()"
			[attr.id]="inputId()"
			role="combobox"
			aria-haspopup="listbox"
			[attr.aria-expanded]="isOpen()"
			[attr.tabindex]="disabled() ? -1 : 0"
			[eduPtRoot]="pt()?.root"
			(click)="toggle($event)"
			(keydown)="onTriggerKeydown($event)"
		>
			@if (hasValue()) {
				@if (display() === 'chip') {
					<ul class="edu-multi-select__tokens">
						@for (opt of visibleSelectedOptions(); track $index) {
							<li class="edu-multi-select__token">
								<span class="edu-multi-select__token-label">{{ resolveLabel(opt) }}</span>
								@if (!disabled()) {
									<button type="button" class="edu-multi-select__token-remove" tabindex="-1" (click)="removeOption(opt, $event)">
										<i class="pi pi-times"></i>
									</button>
								}
							</li>
						}
						@if (overflowLabel(); as label) {
							<li class="edu-multi-select__token edu-multi-select__token--overflow">{{ label }}</li>
						}
					</ul>
				} @else {
					<span class="edu-multi-select__label">{{ commaLabel() }}</span>
				}
			} @else {
				<span class="edu-multi-select__label edu-multi-select__label--placeholder">{{ placeholder() ?? '' }}</span>
			}
			@if (showClear() && hasValue() && !disabled()) {
				<button type="button" class="edu-multi-select__clear" tabindex="-1" (click)="clear($event)">
					<i class="pi pi-times"></i>
				</button>
			}
			<i class="edu-multi-select__chevron pi pi-chevron-down"></i>
		</div>

		<ng-template #overlayTemplate>
			<div class="edu-multi-select-panel">
				@if (filter()) {
					<div class="edu-multi-select-panel__filter">
						<input
							class="edu-input-text"
							type="text"
							[placeholder]="filterPlaceholder() ?? ''"
							[value]="query()"
							(input)="onFilterInput($event)"
							(keydown)="onListKeydown($event)"
						/>
					</div>
				}
				@if (loading()) {
					<div class="edu-multi-select-panel__loading">
						<edu-spinner></edu-spinner>
					</div>
				} @else {
					<ul class="edu-multi-select-panel__list" role="listbox" aria-multiselectable="true" (keydown)="onListKeydown($event)">
						@if (group()) {
							@for (g of filteredGroups(); track $index) {
								<li class="edu-multi-select-panel__group-label" role="presentation">{{ g.label }}</li>
								@for (opt of g.children; track $index) {
									<li
										class="edu-multi-select-panel__option"
										[class.edu-multi-select-panel__option--active]="optionIndex(opt) === activeIndex()"
										[class.edu-multi-select-panel__option--selected]="isSelected(opt)"
										role="option"
										[attr.aria-selected]="isSelected(opt)"
										(click)="toggleOption(opt)"
									>
										<i class="edu-multi-select-panel__check pi pi-check" [class.edu-multi-select-panel__check--visible]="isSelected(opt)"></i>
										<span>{{ resolveLabel(opt) }}</span>
									</li>
								}
							}
						} @else {
							@for (opt of filteredOptions(); track $index) {
								<li
									class="edu-multi-select-panel__option"
									[class.edu-multi-select-panel__option--active]="optionIndex(opt) === activeIndex()"
									[class.edu-multi-select-panel__option--selected]="isSelected(opt)"
									role="option"
									[attr.aria-selected]="isSelected(opt)"
									(click)="toggleOption(opt)"
								>
									<i class="edu-multi-select-panel__check pi pi-check" [class.edu-multi-select-panel__check--visible]="isSelected(opt)"></i>
									<span>{{ resolveLabel(opt) }}</span>
								</li>
							}
						}
						@if (flatOptions().length === 0) {
							<li class="edu-multi-select-panel__empty" role="presentation">Sin resultados</li>
						}
					</ul>
				}
			</div>
		</ng-template>
	`,
	styleUrl: './edu-multi-select.scss',
})
export class EduMultiSelect implements ControlValueAccessor, OnDestroy {
	readonly options = input<unknown[]>([]);
	readonly optionLabel = input<string>();
	readonly optionValue = input<string>();
	readonly filter = input(false);
	readonly filterBy = input<string>();
	readonly filterPlaceholder = input<string>();
	readonly showClear = input(false);
	readonly placeholder = input<string>();
	readonly disabled = input(false);
	readonly appendTo = input<'body'>('body');
	readonly group = input(false);
	readonly optionGroupLabel = input<string>();
	readonly optionGroupChildren = input<string>();
	readonly maxSelectedLabels = input<number>();
	readonly selectedItemsLabel = input('{0} elementos seleccionados');
	/** `chip` (default) matches what edu-multi-select has always rendered — kept as default to avoid a visual regression against the F5 baseline (586). `comma` mirrors PrimeNG's real default, opt-in via this input. */
	readonly display = input<EduMultiSelectDisplay>('chip');
	readonly loading = input(false);
	readonly inputId = input<string>();
	readonly styleClass = input<string>();
	readonly pt = input<EduPassThrough>();

	protected readonly value = signal<unknown[]>([]);
	protected readonly query = signal('');

	private readonly overlayTemplateRef = viewChild<TemplateRef<unknown>>('overlayTemplate');
	private readonly viewContainerRef = inject(ViewContainerRef);
	private readonly overlay = inject(Overlay);
	private readonly focusTrapFactory = inject(FocusTrapFactory);
	private readonly handle = new EduOverlayHandle(this.overlay, this.focusTrapFactory);
	private readonly nav = new SelectListNav();

	protected readonly activeIndex = this.nav.activeIndex;

	protected readonly hasValue = computed(() => this.value().length > 0);

	private readonly flatOptionsUnfiltered = computed(() => {
		if (!this.group()) {
			return this.options();
		}
		const childrenKey = this.optionGroupChildren();
		return (this.options() as Record<string, unknown>[]).flatMap((g) => (childrenKey ? ((g[childrenKey] as unknown[]) ?? []) : []));
	});

	protected readonly selectedOptions = computed(() => {
		const values = this.value();
		return this.flatOptionsUnfiltered().filter((opt) => values.includes(resolveOptionValue(opt, this.optionValue())));
	});

	protected readonly visibleSelectedOptions = computed(() => {
		const max = this.maxSelectedLabels();
		const selected = this.selectedOptions();
		return max != null && selected.length > max ? selected.slice(0, max) : selected;
	});

	protected readonly overflowLabel = computed(() => {
		const max = this.maxSelectedLabels();
		const selected = this.selectedOptions();
		if (max == null || selected.length <= max) return null;
		return this.selectedItemsLabel().replace('{0}', String(selected.length));
	});

	protected readonly commaLabel = computed(() => {
		const max = this.maxSelectedLabels();
		const selected = this.selectedOptions();
		if (max != null && selected.length > max) {
			return this.selectedItemsLabel().replace('{0}', String(selected.length));
		}
		return selected.map((opt) => this.resolveLabel(opt)).join(', ');
	});

	protected readonly filteredOptions = computed(() => filterOptionsByLabel(this.options(), this.query(), this.optionLabel(), this.filterBy()));

	protected readonly filteredGroups = computed<EduMultiSelectGroup[]>(() => {
		const groupLabelKey = this.optionGroupLabel();
		const childrenKey = this.optionGroupChildren();
		const q = this.query();
		return (this.options() as Record<string, unknown>[])
			.map((g) => {
				const children = (childrenKey ? (g[childrenKey] as unknown[]) : []) ?? [];
				return {
					label: groupLabelKey ? String(g[groupLabelKey]) : '',
					children: filterOptionsByLabel(children, q, this.optionLabel(), this.filterBy()),
				};
			})
			.filter((g) => g.children.length > 0);
	});

	protected readonly flatOptions = computed(() => (this.group() ? this.filteredGroups().flatMap((g) => g.children) : this.filteredOptions()));

	private onChange: (value: unknown[]) => void = () => {};
	private onTouched: () => void = () => {};

	protected isOpen(): boolean {
		return this.handle.isOpen;
	}

	ngOnDestroy(): void {
		this.handle.close();
	}

	writeValue(value: unknown[]): void {
		this.value.set(value ?? []);
	}

	registerOnChange(fn: (value: unknown[]) => void): void {
		this.onChange = fn;
	}

	registerOnTouched(fn: () => void): void {
		this.onTouched = fn;
	}

	protected resolveLabel(opt: unknown): string {
		return resolveOptionLabel(opt, this.optionLabel());
	}

	protected optionIndex(opt: unknown): number {
		return this.flatOptions().indexOf(opt);
	}

	protected isSelected(opt: unknown): boolean {
		return this.value().includes(resolveOptionValue(opt, this.optionValue()));
	}

	protected toggle(event: Event): void {
		if (this.disabled()) {
			return;
		}
		if (this.handle.isOpen) {
			this.close();
			return;
		}
		this.open(event.currentTarget as HTMLElement);
	}

	protected clear(event: Event): void {
		event.stopPropagation();
		this.emitValue([]);
	}

	protected removeOption(opt: unknown, event: Event): void {
		event.stopPropagation();
		const optValue = resolveOptionValue(opt, this.optionValue());
		this.emitValue(this.value().filter((v) => v !== optValue));
	}

	protected onFilterInput(event: Event): void {
		this.query.set((event.target as HTMLInputElement).value);
		this.nav.reset();
	}

	protected onTriggerKeydown(event: KeyboardEvent): void {
		if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			if (!this.handle.isOpen) {
				this.open(event.currentTarget as HTMLElement);
			}
		}
	}

	protected onListKeydown(event: KeyboardEvent): void {
		const length = this.flatOptions().length;
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			this.nav.next(length);
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			this.nav.prev();
		} else if (event.key === 'Enter') {
			event.preventDefault();
			const opt = this.flatOptions()[this.activeIndex()];
			if (opt !== undefined) {
				this.toggleOption(opt);
			}
		} else if (event.key === 'Escape') {
			this.close();
		}
	}

	protected toggleOption(opt: unknown): void {
		const optValue = resolveOptionValue(opt, this.optionValue());
		const current = this.value();
		const next = current.includes(optValue) ? current.filter((v) => v !== optValue) : [...current, optValue];
		this.emitValue(next);
	}

	private emitValue(next: unknown[]): void {
		this.value.set(next);
		this.onChange(next);
		this.onTouched();
	}

	private close(): void {
		this.handle.close();
		this.query.set('');
		this.nav.reset();
	}

	private open(trigger: HTMLElement): void {
		const overlayTemplate = this.overlayTemplateRef();
		if (!overlayTemplate) {
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
				panelClass: 'edu-multi-select-pane',
				hasBackdrop: true,
				backdropClass: 'cdk-overlay-transparent-backdrop',
				closeOnBackdropClick: true,
			},
			() => this.close(),
		);
	}
}
