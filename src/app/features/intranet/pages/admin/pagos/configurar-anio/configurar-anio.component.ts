// #region Imports
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { EduSelect } from '@edu-ui';
import { opcionesAnio } from '../utils/carga-inicial.logic';
import { GenerarCargosComponent } from './generar-cargos.component';
import { GenerarCargosFacade } from './generar-cargos.facade';
import { ParametrosAnioComponent } from './parametros-anio.component';
import { ParametrosAnioFacade } from './parametros-anio.facade';
// #endregion

/**
 * «Configurar año»: el arranque de un año de cobranza en dos pasos que comparten el selector de año —
 * primero los parámetros (pago mínimo, recargo, fecha inicial) y luego generar los cargos (P119 F6b).
 */
@Component({
	selector: 'app-configurar-anio',
	standalone: true,
	imports: [FormsModule, EduSelect, GenerarCargosComponent, ParametrosAnioComponent],
	providers: [ParametrosAnioFacade, GenerarCargosFacade],
	template: `
		<div class="configurar-anio">
			<label class="campo campo--anio">
				<span>Año</span>
				<edu-select [options]="anios" [ngModel]="anio()" (ngModelChange)="anio.set($event)" appendTo="body" />
			</label>
			<app-parametros-anio [anio]="anio()" />
			<app-generar-cargos [anio]="anio()" />
		</div>
	`,
	styleUrl: './configurar-anio.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfigurarAnioComponent {
	protected readonly anios = opcionesAnio(new Date());
	protected readonly anio = signal(new Date().getFullYear());
}
