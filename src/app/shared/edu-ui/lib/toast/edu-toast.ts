import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, TemplateRef, computed, contentChild, contentChildren, effect, inject, input } from '@angular/core';
import { EduTemplate } from '../table/edu-template';
import { EduMessageService, EduToastMessage } from './edu-message.service';

export type EduToastPosition = 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right' | 'center';

const SEVERITY_ICON: Record<EduToastMessage['severity'], string> = {
	success: 'pi pi-check-circle',
	info: 'pi pi-info-circle',
	warn: 'pi pi-exclamation-triangle',
	error: 'pi pi-times-circle',
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
				<div class="edu-toast__item" [attr.data-severity]="message.severity" role="alert">
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

	private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();

	constructor() {
		effect(() => {
			for (const message of this.visibleMessages()) {
				if (message.sticky || this.timers.has(message.id)) {
					continue;
				}
				const life = message.life ?? this.life();
				this.timers.set(
					message.id,
					setTimeout(() => this.dismiss(message.id), life),
				);
			}
		});

		inject(DestroyRef).onDestroy(() => {
			this.timers.forEach((timer) => clearTimeout(timer));
			this.timers.clear();
		});
	}

	protected severityIcon(severity: EduToastMessage['severity']): string {
		return SEVERITY_ICON[severity];
	}

	protected dismiss(id: number): void {
		const timer = this.timers.get(id);
		if (timer) {
			clearTimeout(timer);
			this.timers.delete(id);
		}
		this.service.remove(id);
	}
}
