import {
	ChangeDetectionStrategy,
	Component,
	DestroyRef,
	ElementRef,
	computed,
	effect,
	inject,
	input,
	viewChild,
} from '@angular/core';
import { EduTabsService, type EduTabValue } from './edu-tabs.service';

@Component({
	selector: 'edu-tab',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<button
			#tabButton
			type="button"
			role="tab"
			class="edu-tab"
			[attr.id]="tabId()"
			[attr.aria-selected]="active()"
			[attr.aria-controls]="panelId()"
			[attr.tabindex]="tabIndexValue()"
			[class.edu-tab--active]="active()"
			[disabled]="disabled()"
			(click)="select()"
			(keydown.ArrowLeft)="onArrow($event, -1)"
			(keydown.ArrowRight)="onArrow($event, 1)"
		>
			<ng-content></ng-content>
		</button>
	`,
	styleUrl: './edu-tab.scss',
})
export class EduTab {
	readonly value = input.required<EduTabValue>();
	readonly disabled = input(false);

	private readonly service = inject(EduTabsService);
	private readonly destroyRef = inject(DestroyRef);
	private readonly buttonRef = viewChild<ElementRef<HTMLButtonElement>>('tabButton');

	protected readonly active = computed(() => this.service.active() === this.value());
	protected readonly tabIndexValue = computed(() => (this.active() ? 0 : -1));

	constructor() {
		effect(() => {
			const el = this.buttonRef();
			if (el) {
				this.service.registerTab(this.value(), () => this.disabled(), el);
			}
		});
		this.destroyRef.onDestroy(() => this.service.unregisterTab(this.value()));
	}

	protected tabId(): string {
		return this.service.tabId(this.value());
	}

	protected panelId(): string {
		return this.service.panelId(this.value());
	}

	protected select(): void {
		if (!this.disabled()) {
			this.service.select(this.value());
		}
	}

	protected onArrow(event: Event, direction: 1 | -1): void {
		event.preventDefault();
		this.service.focusAdjacent(this.value(), direction);
	}
}
