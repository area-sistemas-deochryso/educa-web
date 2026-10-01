import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { getAvatarRolAccent } from './edu-avatar-rol';

/** Escala de dimensión de imagen/iniciales, no comparable con `EduButtonSize` — ese ajusta densidad de control. */
export type EduAvatarSize = 'normal' | 'large' | 'xlarge';
export type EduAvatarShape = 'square' | 'circle';
export type EduAvatarVariant = 'neutral' | 'brand';

@Component({
	selector: 'edu-avatar',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div
			class="edu-avatar"
			[class.edu-avatar--lg]="size() === 'large'"
			[class.edu-avatar--xl]="size() === 'xlarge'"
			[class.edu-avatar--circle]="shape() === 'circle'"
			[attr.data-variant]="variant()"
			[attr.data-rol-severity]="rolAccent()?.severity"
		>
			@if (icon()) {
				<i [class]="icon()"></i>
			} @else if (label()) {
				{{ label() }}
			} @else {
				<ng-content></ng-content>
			}
		</div>
		@if (rolAccent(); as accent) {
			<span class="edu-avatar__rol-badge" aria-hidden="true" [attr.data-rol-severity]="accent.severity">
				<i [class]="accent.icon"></i>
			</span>
		}
	`,
	styleUrl: './edu-avatar.scss',
})
export class EduAvatar {
	readonly label = input<string>();
	readonly icon = input<string>();
	readonly size = input<EduAvatarSize>('normal');
	readonly shape = input<EduAvatarShape>('square');
	readonly variant = input<EduAvatarVariant>('neutral');
	/** Nombre del rol: añade borde de color + ícono-insignia. El relleno no se toca (reservado al color de curso). */
	readonly rol = input<string | null>();
	protected readonly rolAccent = computed(() => getAvatarRolAccent(this.rol()));
}
