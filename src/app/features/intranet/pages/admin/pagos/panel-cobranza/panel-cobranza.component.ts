import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of, startWith, switchMap } from 'rxjs';

import { logger } from '@core/helpers';
import type { PagoCorte, PanelCobranza } from '@data/models';
import { EduSkeleton } from '@edu-ui';
import { PanelCobranzaFacade } from './panel-cobranza.facade';
import { formatFechaConDia } from '../utils/pagos-format.util';
import { QuienesDebenComponent } from '../quienes-deben/quienes-deben.component';
import { CobranzaCalculoComponent } from './cobranza-calculo.component';
import { CobranzaConteosComponent } from './cobranza-conteos.component';
import { CobranzaDesgloseComponent } from './cobranza-desglose.component';
import { CobranzaKpisComponent } from './cobranza-kpis.component';
import {
	HOY,
	esFechaFutura,
	nombreMes,
	ordenarCortes,
	toIsoLocal,
	validarFechaCorte,
} from './panel-cobranza.logic';

type PanelState =
	| { status: 'loading' }
	| { status: 'error'; message: string }
	| { status: 'ok'; panel: PanelCobranza };

const MESES = Array.from({ length: 12 }, (_, i) => i + 1);

/**
 * Panel de cobranza: foto a «hoy» o a un corte del mes (INV-PG10).
 * Un solo request por cambio de fecha (switchMap); 4xx/429 no se reintentan, el reintento es manual.
 */
@Component({
	selector: 'app-panel-cobranza',
	standalone: true,
	imports: [
		EduSkeleton,
		CobranzaKpisComponent,
		CobranzaConteosComponent,
		CobranzaDesgloseComponent,
		CobranzaCalculoComponent,
		QuienesDebenComponent,
	],
	templateUrl: './panel-cobranza.component.html',
	styleUrl: './panel-cobranza.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelCobranzaComponent {
	private readonly api = inject(PanelCobranzaFacade);

	protected readonly meses = MESES;
	protected readonly nombreMes = nombreMes;
	protected readonly formatFecha = formatFechaConDia;
	protected readonly hoy = toIsoLocal(new Date());
	protected readonly anio = Number(this.hoy.slice(0, 4));
	protected readonly hoyValue = HOY;

	protected readonly seleccion = signal<string>(HOY);
	protected readonly cortes = signal<PagoCorte[]>([]);
	private readonly reload = signal(0);

	/** Fecha de la foto; `null` = hoy. También se la pasamos a «Quiénes deben». */
	readonly fechaFoto = computed<string | null>(() => (this.seleccion() === HOY ? null : this.seleccion()));
	protected readonly fechaVisible = computed(() => this.fechaFoto() ?? this.hoy);

	// Edición de corte
	protected readonly editMes = signal(Number(this.hoy.slice(5, 7)));
	protected readonly editFecha = signal('');
	protected readonly editError = signal<string | null>(null);
	protected readonly guardando = signal(false);

	protected readonly state = toSignal(
		toObservable(computed(() => ({ fecha: this.fechaFoto(), n: this.reload() }))).pipe(
			switchMap(({ fecha }) =>
				this.api.panel(fecha).pipe(
					map((panel): PanelState => ({ status: 'ok', panel })),
					catchError((err: unknown) => {
						logger.error('[PanelCobranza] Error al cargar el panel', err);
						return of<PanelState>({ status: 'error', message: 'No se pudo cargar el panel de cobranza.' });
					}),
					startWith<PanelState>({ status: 'loading' }),
				),
			),
		),
		{ initialValue: { status: 'loading' } as PanelState },
	);

	protected readonly cortesOrdenados = computed(() => ordenarCortes(this.cortes()));

	constructor() {
		this.loadCortes();
	}

	protected esFutura(fecha: string): boolean {
		return esFechaFutura(fecha, this.hoy);
	}

	protected onSelect(value: string): void {
		if (value !== HOY && this.esFutura(value)) return;
		this.seleccion.set(value);
	}

	protected retry(): void {
		this.reload.update((n) => n + 1);
	}

	protected onEditMes(mes: number): void {
		this.editMes.set(mes);
		this.editFecha.set(this.cortes().find((c) => c.mes === mes)?.fecha.slice(0, 10) ?? '');
		this.editError.set(null);
	}

	protected saveCorte(): void {
		const fecha = this.editFecha();
		const error = validarFechaCorte(fecha, this.anio, this.hoy);
		this.editError.set(error);
		if (error) return;

		this.guardando.set(true);
		const previous = this.cortes().find((c) => c.mes === this.editMes())?.fecha.slice(0, 10);
		this.api.guardarCorte({ anio: this.anio, mes: this.editMes(), fecha }).subscribe({
			next: (saved) => {
				this.guardando.set(false);
				this.cortes.update((list) => ordenarCortes([...list.filter((c) => c.mes !== saved.mes), saved]));
				// Editar un corte cambia a propósito la foto de ese mes: si estaba en pantalla, pasa a la nueva fecha.
				if (previous && this.seleccion() === previous) this.seleccion.set(saved.fecha.slice(0, 10));
			},
			error: (err: unknown) => {
				logger.error('[PanelCobranza] Error al guardar el corte', err);
				this.guardando.set(false);
				this.editError.set('No se pudo guardar el corte. Revisa la fecha e inténtalo de nuevo.');
			},
		});
	}

	protected loadCortes(): void {
		this.api.cortes(this.anio).subscribe({
			next: (list) => this.cortes.set(ordenarCortes(list)),
			error: (err: unknown) => logger.error('[PanelCobranza] Error al cargar cortes', err),
		});
	}
}
