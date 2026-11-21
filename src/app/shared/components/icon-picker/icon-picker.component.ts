import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

// #region Implementation
export interface IconPickerOption {
	label: string;
	/** Clase PrimeIcons sin el prefijo 'pi', ej. 'pi-calendar'. */
	value: string;
}

/** Cuadrícula de íconos para elegir uno de un vistazo (reemplaza un select de nombres de ícono). */
@Component({
	selector: 'app-icon-picker',
	standalone: true,
	template: `
		<div class="icon-picker" role="radiogroup" [attr.aria-label]="ariaLabel()">
			@for (option of options(); track option.value) {
				<button
					type="button"
					class="icon-picker__item"
					role="radio"
					[class.icon-picker__item--on]="option.value === value()"
					[attr.aria-checked]="option.value === value()"
					[attr.aria-label]="option.label"
					[title]="option.label"
					(click)="value.set(option.value)"
				>
					<i class="pi {{ option.value }}" aria-hidden="true"></i>
				</button>
			}
		</div>
	`,
	styleUrl: './icon-picker.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconPickerComponent {
	readonly options = input.required<IconPickerOption[]>();
	readonly ariaLabel = input('Ícono');
	readonly value = model<string>('');
}
// #endregion
