import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { EduAccordionService } from './edu-accordion.service';

/** Respaldo si `animationend` no llega (reduced-motion extremo, pestaña en segundo plano, tests). */
const EXIT_FALLBACK_MS = 600;

@Component({
	selector: 'edu-accordion-panel',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div class="edu-accordion-panel" [class.edu-accordion-panel--expanded]="expanded()">
			<ng-content select="edu-accordion-header"></ng-content>
			@if (rendered()) {
				<div
					class="edu-accordion-panel__content"
					[class.edu-accordion-panel__content--entering]="entering()"
					[class.edu-accordion-panel__content--leaving]="leaving()"
					role="region"
					[attr.id]="panelId()"
					[attr.aria-labelledby]="headerId()"
					[attr.inert]="leaving() ? '' : null"
					(animationend)="onAnimationEnd($event)"
				>
					<div class="edu-accordion-panel__clip">
						<div class="edu-accordion-panel__body">
							<ng-content></ng-content>
						</div>
					</div>
				</div>
			}
		</div>
	`,
	styleUrl: './edu-accordion-panel.scss',
})
export class EduAccordionPanel {
	readonly value = input.required<string>();

	private readonly service = inject(EduAccordionService);

	readonly expanded = computed(() => this.service.isExpanded(this.value()));

	/** El contenido sigue en el DOM mientras se pliega: se quita al terminar la salida. */
	readonly rendered = signal(false);
	readonly entering = signal(false);
	readonly leaving = signal(false);

	private initialized = false;
	private exitTimer: ReturnType<typeof setTimeout> | null = null;

	constructor() {
		inject(DestroyRef).onDestroy(() => this.clearExitTimer());

		effect(() => {
			const open = this.expanded();
			untracked(() => this.sync(open));
		});
	}

	toggle(): void {
		this.service.toggle(this.value());
	}

	headerId(): string {
		return this.service.headerId(this.value());
	}

	panelId(): string {
		return this.service.panelId(this.value());
	}

	onAnimationEnd(event: AnimationEvent): void {
		if (event.target !== event.currentTarget || !this.leaving()) return;
		this.finishLeaving();
	}

	private sync(open: boolean): void {
		const animate = this.initialized;
		this.initialized = true;
		this.clearExitTimer();

		if (open) {
			this.leaving.set(false);
			this.entering.set(animate);
			this.rendered.set(true);
			return;
		}

		if (!this.rendered()) return;
		if (!animate) {
			this.finishLeaving();
			return;
		}
		this.entering.set(false);
		this.leaving.set(true);
		this.exitTimer = setTimeout(() => this.finishLeaving(), EXIT_FALLBACK_MS);
	}

	private finishLeaving(): void {
		this.clearExitTimer();
		this.leaving.set(false);
		this.entering.set(false);
		this.rendered.set(false);
	}

	private clearExitTimer(): void {
		if (this.exitTimer === null) return;
		clearTimeout(this.exitTimer);
		this.exitTimer = null;
	}
}
