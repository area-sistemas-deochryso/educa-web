import { ChangeDetectionStrategy, Component, input } from '@angular/core';

// #region Implementation
/** Agrupa campos de un formulario bajo un encabezado corto, para que un formulario largo se lea por bloques. */
@Component({
	selector: 'app-form-section',
	standalone: true,
	template: `
		<section class="form-section">
			<header class="form-section__head">
				<h4 class="form-section__title">{{ heading() }}</h4>
				@if (hint()) {
					<p class="form-section__hint">{{ hint() }}</p>
				}
			</header>
			<div class="form-section__body">
				<ng-content />
			</div>
		</section>
	`,
	styleUrl: './form-section.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormSectionComponent {
	readonly heading = input.required<string>();
	readonly hint = input<string>('');
}
// #endregion
