import { FocusTrapFactory } from '@angular/cdk/a11y';
import { ConnectedPosition, Overlay } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { NgTemplateOutlet } from '@angular/common';
import {
	ChangeDetectionStrategy,
	Component,
	OnDestroy,
	TemplateRef,
	ViewContainerRef,
	computed,
	contentChild,
	forwardRef,
	inject,
	input,
	output,
	signal,
	viewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { EduOverlayHandle } from '../overlay/edu-overlay-handle';
import { EduPassThrough, EduPtRoot } from '../passthrough/edu-pt-root';
import {
	filterOptionsByLabel,
	resolveOptionLabel,
	resolveOptionValue,
} from './select-option-utils';
import { SelectListNav } from './select-list-nav';

export interface EduSelectFilterEvent {
	originalEvent: Event;
	filter: string;
}

interface EduSelectGroup {
	label: string;
	children: unknown[];
}

const PANEL_POSITIONS: ConnectedPosition[] = [
	{ originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4 },
	{ originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -4 },
];

@Component({
	selector: 'edu-select',
	standalone: true,
	imports: [EduPtRoot, NgTemplateOutlet],
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [
		{
			provide: NG_VALUE_ACCESSOR,
			useExisting: forwardRef(() => EduSelect),
			multi: true,
		},
	],
	template: `
		<div
			class="edu-select"
			[eduPtRoot]="$safeNavigationMigration(pt()?.root)"
			[class.edu-select--disabled]="disabled()"
			[class.edu-select--loading]="loading()"
			role="combobox"
			aria-haspopup="listbox"
			[attr.aria-expanded]="isOpen()"
			[attr.aria-busy]="loading()"
			[attr.tabindex]="disabled() ? -1 : 0"
			(click)="toggle($event)"
			(keydown)="onTriggerKeydown($event)"
		>
			@if (selectedItemTemplate(); as tpl) {
				@if (hasValue()) {
					<span class="edu-select__label">
						<ng-container
							[ngTemplateOutlet]="tpl"
							[ngTemplateOutletContext]="{ $implicit: selectedOption() }"
						></ng-container>
					</span>
				} @else {
					<span class="edu-select__label edu-select__label--placeholder">{{
						placeholder() ?? ''
					}}</span>
				}
			} @else {
				<span
					class="edu-select__label"
					[class.edu-select__label--placeholder]="!hasValue()"
				>
					{{ selectedLabel() ?? placeholder() ?? '' }}
				</span>
			}
			@if (showClear() && hasValue() && !disabled() && !loading()) {
				<button
					type="button"
					class="edu-select__clear"
					tabindex="-1"
					(click)="clear($event)"
				>
					<i class="pi pi-times"></i>
				</button>
			}
			@if (loading()) {
				<i class="edu-select__spinner pi pi-spinner pi-spin"></i>
			} @else {
				<i class="edu-select__chevron pi pi-chevron-down"></i>
			}
		</div>

		<ng-template #overlayTemplate>
			<div class="edu-select-panel">
				@if (filter()) {
					<div class="edu-select-panel__filter">
						<input
							class="edu-input-text"
							type="text"
							[value]="query()"
							(input)="onFilterInput($event)"
							(keydown)="onListKeydown($event)"
						/>
					</div>
				}
				<ul class="edu-select-panel__list" role="listbox" (keydown)="onListKeydown($event)">
					@if (group()) {
						@for (g of filteredGroups(); track $index) {
							<li class="edu-select-panel__group-label" role="presentation">
								{{ g.label }}
							</li>
							@for (opt of g.children; track $index) {
								<li
									class="edu-select-panel__option"
									[class.edu-select-panel__option--active]="
										optionIndex(opt) === activeIndex()
									"
									[class.edu-select-panel__option--selected]="isSelected(opt)"
									role="option"
									[attr.aria-selected]="isSelected(opt)"
									(click)="selectOption(opt)"
								>
									@if (itemTemplate(); as tpl) {
										<ng-container
											[ngTemplateOutlet]="tpl"
											[ngTemplateOutletContext]="{ $implicit: opt }"
										></ng-container>
									} @else {
										{{ resolveLabel(opt) }}
									}
								</li>
							}
						}
					} @else {
						@for (opt of filteredOptions(); track $index) {
							<li
								class="edu-select-panel__option"
								[class.edu-select-panel__option--active]="
									optionIndex(opt) === activeIndex()
								"
								[class.edu-select-panel__option--selected]="isSelected(opt)"
								role="option"
								[attr.aria-selected]="isSelected(opt)"
								(click)="selectOption(opt)"
							>
								@if (itemTemplate(); as tpl) {
									<ng-container
										[ngTemplateOutlet]="tpl"
										[ngTemplateOutletContext]="{ $implicit: opt }"
									></ng-container>
								} @else {
									{{ resolveLabel(opt) }}
								}
							</li>
						}
					}
					@if (flatOptions().length === 0) {
						<li class="edu-select-panel__empty" role="presentation">Sin resultados</li>
					}
				</ul>
			</div>
		</ng-template>
	`,
	styleUrl: './edu-select.scss',
})
export class EduSelect implements ControlValueAccessor, OnDestroy {
	readonly options = input<unknown[]>([]);
	readonly optionLabel = input<string>();
	readonly optionValue = input<string>();
	readonly filter = input(false);
	readonly showClear = input(false);
	readonly placeholder = input<string>();
	readonly disabled = input(false);
	readonly appendTo = input<'body'>('body');
	readonly group = input(false);
	readonly optionGroupLabel = input<string>();
	readonly optionGroupChildren = input<string>();
	readonly loading = input(false);
	readonly pt = input<EduPassThrough>();

	protected readonly selectedItemTemplate = contentChild<TemplateRef<unknown>>('selectedItem');
	protected readonly itemTemplate = contentChild<TemplateRef<unknown>>('item');

	readonly onFilter = output<EduSelectFilterEvent>();

	protected readonly value = signal<unknown>(null);
	protected readonly query = signal('');

	private readonly overlayTemplateRef = viewChild<TemplateRef<unknown>>('overlayTemplate');
	private readonly viewContainerRef = inject(ViewContainerRef);
	private readonly overlay = inject(Overlay);
	private readonly focusTrapFactory = inject(FocusTrapFactory);
	private readonly handle = new EduOverlayHandle(this.overlay, this.focusTrapFactory);
	private readonly nav = new SelectListNav();

	protected readonly activeIndex = this.nav.activeIndex;

	protected readonly hasValue = computed(
		() => this.value() !== null && this.value() !== undefined,
	);

	protected readonly selectedOption = computed(() => this.findSelectedOption());

	protected readonly selectedLabel = computed(() => {
		const found = this.selectedOption();
		return found ? this.resolveLabel(found) : null;
	});

	protected readonly filteredOptions = computed(() =>
		filterOptionsByLabel(this.options(), this.query(), this.optionLabel()),
	);

	protected readonly filteredGroups = computed<EduSelectGroup[]>(() => {
		const groupLabelKey = this.optionGroupLabel();
		const childrenKey = this.optionGroupChildren();
		const q = this.query();
		return (this.options() as Record<string, unknown>[])
			.map((g) => {
				const children = (childrenKey ? (g[childrenKey] as unknown[]) : []) ?? [];
				return {
					label: groupLabelKey ? String(g[groupLabelKey]) : '',
					children: filterOptionsByLabel(children, q, this.optionLabel()),
				};
			})
			.filter((g) => g.children.length > 0);
	});

	protected readonly flatOptions = computed(() =>
		this.group() ? this.filteredGroups().flatMap((g) => g.children) : this.filteredOptions(),
	);

	private onChange: (value: unknown) => void = () => {};
	private onTouched: () => void = () => {};

	protected isOpen(): boolean {
		return this.handle.isOpen;
	}

	ngOnDestroy(): void {
		this.handle.close();
	}

	writeValue(value: unknown): void {
		this.value.set(value ?? null);
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

	protected optionIndex(opt: unknown): number {
		return this.flatOptions().indexOf(opt);
	}

	protected isSelected(opt: unknown): boolean {
		return resolveOptionValue(opt, this.optionValue()) === this.value();
	}

	protected toggle(event: Event): void {
		if (this.disabled() || this.loading()) {
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
		this.value.set(null);
		this.onChange(null);
		this.onTouched();
	}

	protected onFilterInput(event: Event): void {
		const filter = (event.target as HTMLInputElement).value;
		this.query.set(filter);
		this.nav.reset();
		this.onFilter.emit({ originalEvent: event, filter });
	}

	protected onTriggerKeydown(event: KeyboardEvent): void {
		if (this.loading()) {
			return;
		}
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
				this.selectOption(opt);
			}
		} else if (event.key === 'Escape') {
			this.close();
		}
	}

	protected selectOption(opt: unknown): void {
		const optValue = resolveOptionValue(opt, this.optionValue());
		this.value.set(optValue);
		this.onChange(optValue);
		this.onTouched();
		this.close();
	}

	private findSelectedOption(): unknown {
		return this.flatOptionsUnfiltered().find(
			(opt) => resolveOptionValue(opt, this.optionValue()) === this.value(),
		);
	}

	private flatOptionsUnfiltered(): unknown[] {
		if (!this.group()) {
			return this.options();
		}
		const childrenKey = this.optionGroupChildren();
		return (this.options() as Record<string, unknown>[]).flatMap((g) =>
			childrenKey ? ((g[childrenKey] as unknown[]) ?? []) : [],
		);
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
				panelClass: 'edu-select-pane',
				hasBackdrop: true,
				backdropClass: 'cdk-overlay-transparent-backdrop',
				closeOnBackdropClick: true,
			},
			() => this.close(),
		);
	}
}
