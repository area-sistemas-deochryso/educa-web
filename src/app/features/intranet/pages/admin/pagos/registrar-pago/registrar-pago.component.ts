// #region Imports
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import type { PagoMedio } from '@data/models';
import { EduButton, EduDatePicker, EduInputNumber, EduMessage, EduSelect } from '@edu-ui';
import { formatSoles } from '../utils/pagos-format.util';
import { RegistrarPagoFacade } from './registrar-pago.facade';
import { diferenciaCentavos } from './registrar-pago.logic';
// #endregion

const MEDIOS: { label: string; value: PagoMedio }[] = [
	{ label: 'Efectivo', value: 'EFECTIVO' },
	{ label: 'Transferencia', value: 'TRANSFERENCIA' },
	{ label: 'Depósito', value: 'DEPOSITO' },
	{ label: 'Yape', value: 'YAPE' },
	{ label: 'Plin', value: 'PLIN' },
	{ label: 'Otro', value: 'OTRO' },
];

/** Fecha local como `yyyy-MM-dd` (sin pasar por UTC, para no correr el día). */
function isoLocal(fecha: Date): string {
	const y = fecha.getFullYear();
	const m = String(fecha.getMonth() + 1).padStart(2, '0');
	const d = String(fecha.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}

/**
 * «Registrar pago»: el alumno que paga llega por `?estudianteId=&nombre=` (buscador pausado, gap G2).
 * Muestra el grupo familiar, pide el reparto propuesto, lo deja editar y registra solo si cuadra con el monto.
 */
@Component({
	selector: 'app-registrar-pago',
	standalone: true,
	imports: [FormsModule, EduButton, EduDatePicker, EduInputNumber, EduMessage, EduSelect],
	providers: [RegistrarPagoFacade],
	templateUrl: './registrar-pago.component.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegistrarPagoComponent {
	protected readonly facade = inject(RegistrarPagoFacade);
	private readonly route = inject(ActivatedRoute);
	private readonly destroyRef = inject(DestroyRef);

	protected readonly medios = MEDIOS;
	protected readonly soles = formatSoles;
	protected readonly hoy = new Date();

	protected readonly monto = signal<number | null>(null);
	protected readonly fecha = signal<Date>(new Date());
	protected readonly hora = signal<string | null>(null);
	protected readonly medio = signal<PagoMedio>('TRANSFERENCIA');
	protected readonly banco = signal('');
	protected readonly operacion = signal('');
	protected readonly comprobante = signal('');
	protected readonly observaciones = signal('');

	constructor() {
		this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
			const id = Number(params.get('estudianteId'));
			const nombre = params.get('nombre') ?? '';
			if (Number.isInteger(id) && id > 0) this.facade.iniciar({ id, nombre });
		});
	}

	protected montoValor(): number {
		return this.monto() ?? 0;
	}

	protected diferencia(): number {
		return diferenciaCentavos(this.montoValor(), this.facade.reparto());
	}

	protected puedeProponer(): boolean {
		return this.montoValor() > 0 && this.facade.idsSeleccionados().length > 0 && !this.facade.loadingReparto();
	}

	protected proponer(): void {
		this.facade.proponer(this.montoValor(), isoLocal(this.fecha()));
	}

	protected editar(index: number, campo: 'montoBase' | 'montoRecargo', evento: Event): void {
		const valor = Number((evento.target as HTMLInputElement).value);
		this.facade.editarAplicacion(index, campo, Number.isFinite(valor) ? valor : 0);
	}

	protected registrar(): void {
		this.facade.registrar({
			monto: this.montoValor(),
			fechaPago: isoLocal(this.fecha()),
			horaPago: this.hora(),
			medio: this.medio(),
			bancoOrigen: this.banco().trim() || null,
			numeroOperacion: this.operacion().trim() || null,
			comprobante: this.comprobante(),
			observaciones: this.observaciones(),
		});
	}
}
