import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Componente presentacional para mostrar errores de validación de formularios
 * Uso: <app-form-field-error [error]="errorSignal()" />
 */
@Component({
	selector: 'app-form-field-error',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './form-field-error.component.html',
	styleUrls: ['./form-field-error.component.scss'],
})
export class FormFieldErrorComponent {
	// * Single field error message (null hides the element).
	/** Mensaje de error a mostrar (null si no hay error) */
	readonly error = input<string | null>(null);
}
