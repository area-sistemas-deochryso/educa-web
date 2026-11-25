import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import type { PagoCorte } from '@data/models';
import { EduSelectButton } from '@edu-ui';
import { HOY, esFechaFutura, nombreMes, ordenarCortes } from '../panel-cobranza/panel-cobranza.logic';
import { formatFechaConDia } from '../utils/pagos-format.util';

/**
 * Selector «A hoy / Al corte» compartido por el panel y «Meses pagados» (INV-PG10: misma regla de cortes).
 * Presentacional: `seleccion` es `HOY` o una fecha ISO de corte; el padre guarda el valor y carga los cortes.
 */
@Component({
	selector: 'app-foto-fecha-selector',
	standalone: true,
	imports: [FormsModule, EduSelectButton],
	template: `
		<edu-select-button
			class="foto__modo"
			[options]="modoOpciones"
			optionLabel="label"
			optionValue="value"
			[allowEmpty]="false"
			[ngModel]="modo()"
			(ngModelChange)="onModo($event)"
			aria-label="Tipo de foto"
		/>

		@if (modo() === 'corte') {
			<label class="foto__field">
				<span>Corte</span>
				<select data-testid="selector-foto" (change)="onSelect($any($event.target).value)">
					@for (c of cortesOrdenados(); track c.mes) {
						<option
							[value]="c.fecha.slice(0, 10)"
							[selected]="c.fecha.slice(0, 10) === seleccion()"
							[disabled]="esFutura(c.fecha)"
						>
							Corte de {{ nombreMes(c.mes) }}: {{ formatFecha(c.fecha) }}{{ esFutura(c.fecha) ? ' (aún no llega)' : '' }}
						</option>
					}
				</select>
			</label>
		}

		<p class="foto__fecha" data-testid="fecha-foto">
			Foto al <strong>{{ formatFecha(fechaVisible()) }}</strong>
			@if (seleccion() === hoyValue) {
				(hoy)
			}
		</p>
	`,
	styleUrl: './foto-fecha-selector.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FotoFechaSelectorComponent {
	readonly seleccion = input.required<string>();
	readonly cortes = input<readonly PagoCorte[]>([]);
	/** Hoy en ISO local (`YYYY-MM-DD`); lo calcula el padre para que ambos lados comparen con lo mismo. */
	readonly hoy = input.required<string>();

	readonly seleccionChange = output<string>();

	protected readonly modoOpciones = [
		{ label: 'Al corte', value: 'corte' },
		{ label: 'A hoy', value: 'hoy' },
	];
	protected readonly hoyValue = HOY;
	protected readonly nombreMes = nombreMes;
	protected readonly formatFecha = formatFechaConDia;

	/** Último corte mirado: «Al corte» vuelve a él tras pasar por «A hoy». */
	private readonly ultimoCorte = signal<string | null>(null);

	protected readonly modo = computed(() => (this.seleccion() === HOY ? 'hoy' : 'corte'));
	protected readonly cortesOrdenados = computed(() => ordenarCortes(this.cortes()));
	protected readonly fechaVisible = computed(() => (this.seleccion() === HOY ? this.hoy() : this.seleccion()));

	protected esFutura(fecha: string): boolean {
		return esFechaFutura(fecha, this.hoy());
	}

	protected onSelect(value: string): void {
		if (value !== HOY && this.esFutura(value)) return;
		if (value !== HOY) this.ultimoCorte.set(value);
		this.seleccionChange.emit(value);
	}

	/** «A hoy» = sin fecha; «Al corte» = el último corte mirado o, si no hay, el más reciente que ya llegó. */
	protected onModo(modo: string): void {
		if (modo === 'hoy') {
			this.seleccionChange.emit(HOY);
			return;
		}
		const alcanzados = this.cortesOrdenados().filter((c) => !this.esFutura(c.fecha));
		const destino =
			this.ultimoCorte() ??
			alcanzados
				.map((c) => c.fecha.slice(0, 10))
				.sort()
				.at(-1);
		if (destino) this.onSelect(destino);
	}
}
