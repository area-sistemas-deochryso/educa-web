import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, TemplateRef, computed, contentChild, contentChildren, effect, inject, input, signal } from '@angular/core';
import { EduTemplate } from '../table/edu-template';
import { EduMessageService, EduToastMessage } from './edu-message.service';

/** Respaldo si `animationend` no llega (reduced-motion extremo, pestaña en segundo plano, tests). */
const EXIT_FALLBACK_MS = 600;

interface ToastTimer {
	remaining: number;
	startedAt: number;
	handle: ReturnType<typeof setTimeout> | null;
}

export type EduToastPosition = 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right' | 'center';

const SEVERITY_ICON: Record<EduToastMessage['severity'], string> = {
	success: 'pi pi-check-circle',
	info: 'pi pi-info-circle',
	warn: 'pi pi-exclamation-triangle',
	danger: 'pi pi-times-circle',
};

/**
 * Global (one per app, providedIn: 'root') or local: consumers scope a fresh EduMessageService
 * via `providers: [EduMessageService]` on their own component — edu-toast itself never decides
 * scope, it just reads whatever service instance its injector resolves. No CDK Overlay: fixed
 * positioning is enough for a corner stack, unlike Dialog/Drawer which need FocusTrap.
 */
@Component({
	selector: 'edu-toast',
	standalone: true,
	imports: [NgTemplateOutlet],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div class="edu-toast" [attr.data-position]="position()">
			@for (message of visibleMessages(); track message.id) {
				<div
					class="edu-toast__item"
					[class.edu-toast__item--leaving]="leavingIds().has(message.id)"
					[attr.data-severity]="message.severity"
					[attr.data-paused]="pausedIds().has(message.id) || null"
					role="alert"
					(mouseenter)="hold(message.id, 'hover')"
					(mouseleave)="release(message.id, 'hover')"
					(focusin)="hold(message.id, 'focus')"
					(focusout)="onFocusOut($event, message.id)"
					(animationend)="onAnimationEnd($event, message.id)"
				>
					@if (messageTemplate(); as template) {
						<ng-container [ngTemplateOutlet]="template" [ngTemplateOutletContext]="{ $implicit: message }"></ng-container>
					} @else {
						<i class="edu-toast__icon" [class]="severityIcon(message.severity)"></i>
						<div class="edu-toast__content">
							<div class="edu-toast__summary">{{ message.summary }}</div>
							<div class="edu-toast__detail">{{ message.detail }}</div>
						</div>
					}
					<button type="button" class="edu-toast__close" (click)="dismiss(message.id)" aria-label="Cerrar">
						<i class="pi pi-times"></i>
					</button>
					@if (!message.sticky) {
						<div class="edu-toast__bar" aria-hidden="true" [style.--toast-life]="(message.life ?? life()) + 'ms'"></div>
					}
				</div>
			}
		</div>
	`,
	styleUrl: './edu-toast.scss',
})
export class EduToast {
	readonly position = input<EduToastPosition>('top-right');
	readonly life = input(3000);
	readonly key = input<string>();

	protected readonly service = inject(EduMessageService);

	private readonly messageTemplateRef = contentChild<TemplateRef<unknown>>('message');
	private readonly legacyTemplates = contentChildren(EduTemplate);
	protected readonly messageTemplate = computed(() => this.messageTemplateRef() ?? this.legacyTemplates().find((template) => template.pTemplate() === 'message')?.templateRef);

	protected readonly visibleMessages = computed(() => this.service.messages().filter((message) => message.key === this.key()));

	protected readonly leavingIds = signal<ReadonlySet<number>>(new Set());
	protected readonly pausedIds = signal<ReadonlySet<number>>(new Set());

	private readonly timers = new Map<number, ToastTimer>();
	private readonly exitTimers = new Map<number, ReturnType<typeof setTimeout>>();
	/** Motivos de pausa activos por toast (cursor encima, foco dentro): se reanuda al soltar el último. */
	private readonly holds = new Map<number, Set<string>>();

	constructor() {
		effect(() => {
			for (const message of this.visibleMessages()) {
				if (message.sticky || this.timers.has(message.id)) {
					continue;
				}
				const life = message.life ?? this.life();
				this.timers.set(message.id, { remaining: life, startedAt: Date.now(), handle: setTimeout(() => this.dismiss(message.id), life) });
			}
		});

		inject(DestroyRef).onDestroy(() => {
			this.timers.forEach((timer) => timer.handle && clearTimeout(timer.handle));
			this.timers.clear();
			this.exitTimers.forEach((timer) => clearTimeout(timer));
			this.exitTimers.clear();
		});
	}

	protected severityIcon(severity: EduToastMessage['severity']): string {
		return SEVERITY_ICON[severity];
	}

	protected hold(id: number, reason: string): void {
		const timer = this.timers.get(id);
		if (!timer || this.leavingIds().has(id)) {
			return;
		}
		const reasons = this.holds.get(id) ?? new Set<string>();
		reasons.add(reason);
		this.holds.set(id, reasons);
		if (timer.handle) {
			clearTimeout(timer.handle);
			timer.handle = null;
			timer.remaining = Math.max(0, timer.remaining - (Date.now() - timer.startedAt));
			this.pausedIds.update((ids) => new Set(ids).add(id));
		}
	}

	protected release(id: number, reason: string): void {
		const reasons = this.holds.get(id);
		const timer = this.timers.get(id);
		if (!reasons || !timer) {
			return;
		}
		reasons.delete(reason);
		if (reasons.size > 0 || timer.handle) {
			return;
		}
		this.holds.delete(id);
		timer.startedAt = Date.now();
		timer.handle = setTimeout(() => this.dismiss(id), timer.remaining);
		this.pausedIds.update((ids) => {
			const next = new Set(ids);
			next.delete(id);
			return next;
		});
	}

	protected onFocusOut(event: FocusEvent, id: number): void {
		const item = event.currentTarget as HTMLElement;
		if (!item.contains(event.relatedTarget as Node | null)) {
			this.release(id, 'focus');
		}
	}

	protected onAnimationEnd(event: AnimationEvent, id: number): void {
		if (event.target === event.currentTarget && event.animationName === 'edu-toast-exit') {
			this.finishExit(id);
		}
	}

	/** Cierra con salida animada: el nodo se retiene como `--leaving` hasta que termina (o vence el respaldo). */
	protected dismiss(id: number): void {
		if (this.leavingIds().has(id)) {
			return;
		}
		const timer = this.timers.get(id);
		if (timer?.handle) {
			clearTimeout(timer.handle);
		}
		this.timers.delete(id);
		this.holds.delete(id);
		this.pausedIds.update((ids) => {
			const next = new Set(ids);
			next.delete(id);
			return next;
		});
		this.leavingIds.update((ids) => new Set(ids).add(id));
		this.exitTimers.set(id, setTimeout(() => this.finishExit(id), EXIT_FALLBACK_MS));
	}

	private finishExit(id: number): void {
		const exitTimer = this.exitTimers.get(id);
		if (exitTimer === undefined) {
			return;
		}
		clearTimeout(exitTimer);
		this.exitTimers.delete(id);
		this.leavingIds.update((ids) => {
			const next = new Set(ids);
			next.delete(id);
			return next;
		});
		this.service.remove(id);
	}
}
