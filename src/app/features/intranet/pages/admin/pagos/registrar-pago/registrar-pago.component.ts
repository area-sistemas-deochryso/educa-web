// #region Imports
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import type { EstudianteBusqueda, PagoMedio } from '@data/models';
import { EduAutoComplete, EduButton, EduDatePicker, EduInputNumber, EduMessage, EduSelect, EduTemplate } from '@edu-ui';
import { formatFechaConDia, formatSoles } from '../utils/pagos-format.util';
import { RegistrarPagoFacade } from './registrar-pago.facade';
import { camposFaltantes, diferenciaCentavos, teclaPermitidaEnMonto } from './registrar-pago.logic';
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
 * «Registrar pago»: el alumno que paga se elige con el buscador o llega por `?estudianteId=&nombre=` (desde «Quiénes deben»).
 * Muestra el grupo familiar, pide el reparto propuesto, lo deja editar y registra solo si cuadra con el monto.
 */
@Component({
	selector: 'app-registrar-pago',
	standalone: true,
	imports: [FormsModule, RouterLink, EduAutoComplete, EduButton, EduDatePicker, EduInputNumber, EduMessage, EduSelect, EduTemplate],
	providers: [RegistrarPagoFacade],
	templateUrl: './registrar-pago.component.html',
	styleUrl: './registrar-pago.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegistrarPagoComponent {
	protected readonly facade = inject(RegistrarPagoFacade);
	private readonly route = inject(ActivatedRoute);
	private readonly destroyRef = inject(DestroyRef);

	protected readonly medios = MEDIOS;
	protected readonly soles = formatSoles;
	protected readonly fechaConDia = formatFechaConDia;
	protected readonly hoy = new Date();

	/** Alumno elegido en el buscador (o el precargado por la ruta); el autocomplete lo muestra como texto. */
	protected readonly seleccionado = signal<EstudianteBusqueda | null>(null);

	protected readonly monto = signal<number | null>(null);
	protected readonly fecha = signal<Date | null>(new Date());
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
			if (Number.isInteger(id) && id > 0) {
				this.seleccionado.set({ estudianteId: id, nombreCompleto: nombre, salon: null });
				this.facade.iniciar({ id, nombre });
			}
		});
	}

	/** Obligatorios del contrato que faltan. Se muestra junto al botón y bloquea el registro. */
	protected readonly faltantes = computed(() =>
		camposFaltantes({ monto: this.monto() ?? 0, comprobante: this.comprobante(), fechaValida: this.fecha() !== null }),
	);

	/** Por qué «Registrar pago» está deshabilitado. `null` = habilitado o guardando. */
	protected readonly motivoBloqueo = computed(() => {
		const faltan = this.faltantes();
		if (faltan.length > 0) return `Falta completar: ${faltan.join(', ')}.`;
		if (this.facade.reparto().length === 0) return 'Propón el reparto antes de registrar.';
		return null;
	});

	protected montoValor(): number {
		return this.monto() ?? 0;
	}

	protected diferencia(): number {
		return diferenciaCentavos(this.montoValor(), this.facade.reparto());
	}

	protected puedeProponer(): boolean {
		return (
			this.montoValor() > 0 &&
			this.fecha() !== null &&
			this.facade.idsSeleccionados().length > 0 &&
			!this.facade.loadingReparto()
		);
	}

	protected puedeRegistrar(): boolean {
		return this.faltantes().length === 0 && this.facade.puedeRegistrar(this.montoValor());
	}

	/** Solo dígitos, punto y coma en el monto; el resto de teclas se descarta antes de llegar al input. */
	protected filtrarTeclaMonto(evento: KeyboardEvent): void {
		const conAtajo = evento.ctrlKey || evento.metaKey || evento.altKey;
		if (!teclaPermitidaEnMonto(evento.key, conAtajo)) evento.preventDefault();
	}

	protected buscarEstudiantes(evento: { query: string }): void {
		this.facade.buscarEstudiantes(evento.query);
	}

	protected elegirEstudiante(estudiante: EstudianteBusqueda): void {
		this.seleccionado.set(estudiante);
		this.facade.iniciar({ id: estudiante.estudianteId, nombre: estudiante.nombreCompleto });
	}

	protected cambiarMonto(valor: number | null): void {
		this.monto.set(valor);
		this.facade.descartarErrorRegistro();
	}

	protected proponer(): void {
		const fecha = this.fecha();
		if (fecha) this.facade.proponer(this.montoValor(), isoLocal(fecha));
	}

	protected editar(index: number, campo: 'montoBase' | 'montoRecargo', evento: Event): void {
		const valor = Number((evento.target as HTMLInputElement).value);
		this.facade.editarAplicacion(index, campo, Number.isFinite(valor) ? valor : 0);
	}

	protected registrar(): void {
		const fecha = this.fecha();
		if (!fecha || !this.puedeRegistrar()) return;
		this.facade.registrar({
			monto: this.montoValor(),
			fechaPago: isoLocal(fecha),
			horaPago: this.hora(),
			medio: this.medio(),
			bancoOrigen: this.banco().trim() || null,
			numeroOperacion: this.operacion().trim() || null,
			comprobante: this.comprobante(),
			observaciones: this.observaciones(),
		});
	}
}
