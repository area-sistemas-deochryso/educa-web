// #region Imports
import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { RolService } from '@core/services/roles';
import { EduButton, EduInputNumber, EduSelect, EduTag } from '@edu-ui';

import { CreacionMasivaResponseDto } from '../../models';

// #endregion
// #region Implementation

/**
 * Generación sintética de Usuarios (P107 F3c) — a diferencia de Salones/Cursos necesita
 * elegir Rol además de Cantidad. Estudiante queda fuera (tiene su propio import, ver 625 BE).
 */
@Component({
	selector: 'app-usuarios-generate-form',
	standalone: true,
	imports: [FormsModule, EduInputNumber, EduSelect, EduButton, EduTag],
	templateUrl: './usuarios-generate-form.component.html',
	styleUrl: './usuarios-generate-form.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsuariosGenerateFormComponent {
	private readonly rolService = inject(RolService);

	readonly generating = input<boolean>(false);
	readonly result = input<CreacionMasivaResponseDto | null>(null);

	readonly generar = output<{ rol: string; cantidad: number }>();

	readonly rolesSelectOptions = computed(() =>
		this.rolService
			.all()
			.filter((r) => r.nombre !== 'Estudiante')
			.map((r) => ({ label: r.nombre, value: r.nombre })),
	);

	readonly rol = signal<string | null>(null);
	readonly cantidad = signal<number>(5);

	readonly canGenerar = computed(() => !!this.rol() && this.cantidad() >= 1 && this.cantidad() <= 100);

	onGenerar(): void {
		const rol = this.rol();
		const cantidad = this.cantidad();
		if (!rol || cantidad < 1 || cantidad > 100) return;
		this.generar.emit({ rol, cantidad });
	}
}
// #endregion
