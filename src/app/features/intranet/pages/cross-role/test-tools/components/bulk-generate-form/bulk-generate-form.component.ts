// #region Imports
import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { EduButton, EduInputNumber, EduTag } from '@edu-ui';

import { CreacionMasivaResponseDto } from '../../models';

// #endregion
// #region Implementation
/**
 * Control reusable de generación sintética (P107 F3) — misma forma para cualquier
 * entidad hoy (Cantidad + botón), instanciado una vez por entidad desde el panel padre.
 */
@Component({
	selector: 'app-bulk-generate-form',
	standalone: true,
	imports: [FormsModule, EduInputNumber, EduButton, EduTag],
	templateUrl: './bulk-generate-form.component.html',
	styleUrl: './bulk-generate-form.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BulkGenerateFormComponent {
	readonly entityLabel = input.required<string>();
	readonly generating = input<boolean>(false);
	readonly result = input<CreacionMasivaResponseDto | null>(null);

	readonly generar = output<number>();

	readonly cantidad = signal<number>(5);

	onGenerar(): void {
		const valor = this.cantidad();
		if (!valor || valor < 1 || valor > 100) return;
		this.generar.emit(valor);
	}
}
// #endregion
