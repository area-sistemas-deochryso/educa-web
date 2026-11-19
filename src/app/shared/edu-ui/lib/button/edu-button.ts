import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, input, signal, untracked } from '@angular/core';
import { EduPassThrough, EduPtRoot } from '../passthrough/edu-pt-root';

export type EduButtonSeverity =
	| 'primary'
	| 'secondary'
	| 'success'
	| 'info'
	| 'warn'
	| 'danger'
	| 'help'
	| 'contrast';

/** Densidad de control (padding/font-size), no comparable con `EduAvatarSize` — ese escala una imagen circular. */
export type EduButtonSize = 'xs' | 'small' | 'large';
export type EduButtonIconPos = 'left' | 'right';
export type EduButtonType = 'button' | 'submit';

@Component({
	selector: 'edu-button',
	standalone: true,
	imports: [EduPtRoot],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<button
			class="edu-button"
			[attr.type]="type()"
			[eduPtRoot]="$safeNavigationMigration(pt()?.root)"
			[disabled]="disabled() || loading()"
			[attr.data-severity]="severity()"
			[attr.aria-busy]="loading()"
				[attr.data-success]="showSuccess() || null"
				[style.min-width.px]="lockedWidth()"
				[class.motion-ripple]="rippleActive()"
				[class.edu-button--success]="showSuccess()"
			[class.edu-button--text]="text()"
			[class.edu-button--outlined]="outlined()"
			[class.edu-button--rounded]="rounded()"
			[class.edu-button--xs]="size() === 'xs'"
			[class.edu-button--sm]="size() === 'small'"
			[class.edu-button--lg]="size() === 'large'"
			[class.edu-button--icon-only]="(!!icon() || loading() || showSuccess()) && !label()"
				(pointerdown)="onPointerDown($event)"
				(animationend)="onAnimationEnd($event)"
		>
			@if (iconPos() === 'right') {
				@if (label()) {
					<span class="edu-button__label">{{ label() }}</span>
				}
				@if (loading()) {
					<i class="edu-button__icon pi pi-spinner pi-spin"></i>
				} @else if (showSuccess()) {
					<i class="edu-button__icon edu-button__check pi pi-check motion-value-bounce"></i>
				} @else if (icon()) {
					<i class="edu-button__icon" [class]="icon()"></i>
				}
			} @else {
				@if (loading()) {
					<i class="edu-button__icon pi pi-spinner pi-spin"></i>
				} @else if (showSuccess()) {
					<i class="edu-button__icon edu-button__check pi pi-check motion-value-bounce"></i>
				} @else if (icon()) {
					<i class="edu-button__icon" [class]="icon()"></i>
				}
				@if (label()) {
					<span class="edu-button__label">{{ label() }}</span>
				}
			}
			<ng-content></ng-content>
		</button>
		<span class="edu-button__status" role="status">{{ showSuccess() ? successLabel() : '' }}</span>
	`,
	styleUrl: './edu-button.scss',
})
export class EduButton {
	readonly label = input<string>();
	readonly icon = input<string>();
	readonly severity = input<EduButtonSeverity>('primary');
	readonly size = input<EduButtonSize>();
	readonly text = input(false);
	readonly rounded = input(false);
	readonly outlined = input(false);
	readonly disabled = input(false);
	readonly loading = input(false);
	/** Resultado exitoso; lo apaga el consumidor. Si `loading` está activo, gana `loading`. */
	readonly success = input(false);
	/** Texto para lectores de pantalla al entrar en éxito. */
	readonly successLabel = input('Completado');
	/** Onda desde el punto de presión. Solo aplica a `severity="primary"` sin `text`. */
	readonly ripple = input(false);
	readonly iconPos = input<EduButtonIconPos>('left');
	readonly type = input<EduButtonType>('button');
	readonly pt = input<EduPassThrough>();

	private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

	protected readonly showSuccess = computed(() => this.success() && !this.loading());
	protected readonly rippleActive = computed(() => this.ripple() && this.severity() === 'primary' && !this.text());
	/** Ancho en reposo, fijado mientras dura `loading`/`success` para que el layout no salte. */
	protected readonly lockedWidth = signal<number | null>(null);

	constructor() {
		effect(() => {
			const busy = this.loading() || this.success();
			untracked(() => {
				if (!busy) {
					this.lockedWidth.set(null);
				} else if (this.lockedWidth() === null) {
					this.lockedWidth.set(this.host.nativeElement.querySelector('button')?.offsetWidth ?? null);
				}
			});
		});
	}

	protected onPointerDown(event: PointerEvent): void {
		if (!this.rippleActive()) return;
		const button = event.currentTarget as HTMLElement;
		const rect = button.getBoundingClientRect();
		button.style.setProperty('--ripple-x', `${event.clientX - rect.left}px`);
		button.style.setProperty('--ripple-y', `${event.clientY - rect.top}px`);
		button.classList.remove('is-rippling');
		void button.offsetWidth; // reinicia la animación si se presiona de nuevo
		button.classList.add('is-rippling');
	}

	protected onAnimationEnd(event: AnimationEvent): void {
		if (event.animationName === 'motion-ripple') {
			(event.currentTarget as HTMLElement).classList.remove('is-rippling');
		}
	}
}
