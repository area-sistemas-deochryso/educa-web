// #region Imports
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import type { CuentaAjuste, CuentaCargo, CuentaPago, EstudianteBusqueda, RegistrarAjustePayload } from '@data/models';
import { EduAutoComplete, EduButton, EduMessage, EduTag, EduTemplate } from '@edu-ui';
import { ErrorStateComponent } from '@shared/components';
import { formatSoles } from '../utils/pagos-format.util';
import { AccionesCuentaFacade, type ResultadoAccion } from './acciones-cuenta.facade';
import { admiteAjuste, avisoAnularPago, topeAjuste } from './acciones-cuenta.logic';
import { AjusteDialogComponent } from './ajuste-dialog.component';
import { AnularDialogComponent } from './anular-dialog.component';
import { EstadoCuentaFacade } from './estado-cuenta.facade';
import {
	CATEGORIAS,
	ESTADOS_CARGO,
	detalleAnulacion,
	fechaOVacio,
	fechaPagoDe,
	montoPagoDe,
	recargoDe,
	saldoDe,
} from './estado-cuenta.logic';
import { type ColumnaTabla, EstadoCuentaTablaComponent } from './estado-cuenta-tabla.component';
// #endregion

const MEDIOS: Record<string, string> = {
	EFECTIVO: 'Efectivo',
	TRANSFERENCIA: 'Transferencia',
	DEPOSITO: 'Depósito',
	YAPE: 'Yape',
	PLIN: 'Plin',
	OTRO: 'Otro',
};

const TIPOS_AJUSTE: Record<string, string> = { DESCUENTO: 'Descuento', ESPECIE: 'En especie' };

const conceptoDe = (c: Pick<CuentaCargo, 'concepto' | 'cuota'>): string => (c.cuota ? `${c.concepto} · ${c.cuota}` : c.concepto);

/**
 * «Estado de cuenta»: el alumno se elige con el buscador o llega por `/estado-cuenta/:estudianteId`
 * (desde «¿Quiénes deben?», «Sin dato» o el aviso de un pago en curso). Muestra cargos, pagos y ajustes, anulados incluidos.
 */
@Component({
	selector: 'app-estado-cuenta',
	standalone: true,
	imports: [
		FormsModule,
		AjusteDialogComponent,
		AnularDialogComponent,
		EduAutoComplete,
		EduButton,
		EduMessage,
		EduTag,
		EduTemplate,
		ErrorStateComponent,
		EstadoCuentaTablaComponent,
	],
	providers: [EstadoCuentaFacade, AccionesCuentaFacade],
	templateUrl: './estado-cuenta.component.html',
	styleUrl: './estado-cuenta.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EstadoCuentaComponent {
	protected readonly facade = inject(EstadoCuentaFacade);
	protected readonly acciones = inject(AccionesCuentaFacade);
	private readonly route = inject(ActivatedRoute);
	private readonly router = inject(Router);
	private readonly destroyRef = inject(DestroyRef);

	protected readonly soles = formatSoles;
	protected readonly seleccionado = signal<EstudianteBusqueda | null>(null);

	private readonly anularDialog = viewChild.required(AnularDialogComponent);
	private readonly ajusteDialog = viewChild.required(AjusteDialogComponent);
	/** Qué se está anulando mientras el diálogo de anulación está abierto. */
	private pendiente: { tipo: 'pago' | 'ajuste'; id: number } | null = null;

	protected readonly categoria = computed(() => {
		const c = this.facade.cuenta();
		return c ? CATEGORIAS[c.categoria] : null;
	});

	protected readonly anioSinParametros = computed(
		() => this.facade.cuenta()?.cargos.some((c) => c.anioSinParametros) ?? false,
	);

	protected readonly columnasCargos: ColumnaTabla<CuentaCargo>[] = [
		{ key: 'concepto', label: 'Concepto', texto: conceptoDe },
		{ key: 'vencimiento', label: 'Vence', texto: (c) => fechaOVacio(c.vencimiento), valor: (c) => c.vencimiento },
		{ key: 'montoBase', label: 'Monto', numeric: true, texto: (c) => formatSoles(c.montoBase), valor: (c) => c.montoBase },
		{ key: 'ajuste', label: 'Ajustes', numeric: true, texto: (c) => formatSoles(c.ajuste), valor: (c) => c.ajuste },
		{
			key: 'pagado',
			label: 'Pagado',
			numeric: true,
			texto: (c) => formatSoles(c.pagadoBase + c.pagadoRecargo),
			valor: (c) => c.pagadoBase + c.pagadoRecargo,
		},
		{ key: 'recargo', label: 'Recargo', numeric: true, texto: recargoDe, valor: (c) => (c.estado === 'SinDato' ? null : c.recargo) },
		{ key: 'saldo', label: 'Saldo', numeric: true, texto: saldoDe, valor: (c) => (c.estado === 'SinDato' ? null : c.saldo) },
		{ key: 'estado', label: 'Estado', texto: (c) => ESTADOS_CARGO[c.estado] },
	];

	protected readonly columnasPagos: ColumnaTabla<CuentaPago>[] = [
		{ key: 'pagoId', label: 'N.º', numeric: true, texto: (p) => String(p.pagoId), valor: (p) => p.pagoId },
		{ key: 'fecha', label: 'Fecha', texto: fechaPagoDe, valor: (p) => `${p.fechaPago.slice(0, 10)} ${p.horaPago ?? ''}` },
		{ key: 'medio', label: 'Medio', texto: (p) => MEDIOS[p.medio] ?? p.medio },
		{
			key: 'comprobante',
			label: 'Comprobante',
			texto: (p) => (p.numeroOperacion ? `${p.comprobante} · op. ${p.numeroOperacion}` : p.comprobante),
		},
		{ key: 'monto', label: 'Monto', numeric: true, texto: montoPagoDe, valor: (p) => p.monto },
		{ key: 'estado', label: 'Estado', texto: (p) => (p.vigente ? 'Vigente' : 'Anulado') },
	];

	protected readonly columnasAjustes = computed<ColumnaTabla<CuentaAjuste>[]>(() => {
		const cargos = this.facade.cuenta()?.cargos ?? [];
		const cargoDe = (id: number): string => {
			const c = cargos.find((x) => x.cargoId === id);
			return c ? conceptoDe(c) : `Cargo ${id}`;
		};
		return [
			{ key: 'cargo', label: 'Cargo', texto: (a) => cargoDe(a.cargoId) },
			{ key: 'tipo', label: 'Tipo', texto: (a) => TIPOS_AJUSTE[a.tipo] ?? a.tipo },
			{ key: 'monto', label: 'Monto', numeric: true, texto: (a) => formatSoles(a.monto), valor: (a) => a.monto },
			{ key: 'motivo', label: 'Motivo', texto: (a) => a.motivo ?? '—' },
			{ key: 'estado', label: 'Estado', texto: (a) => (a.vigente ? 'Vigente' : 'Anulado') },
		];
	});

	protected readonly pagoAnulado = (p: CuentaPago): boolean => !p.vigente;
	protected readonly ajusteAnulado = (a: CuentaAjuste): boolean => !a.vigente;
	protected readonly detallePago = (p: CuentaPago): string => detalleAnulacion(p);
	protected readonly detalleAjuste = (a: CuentaAjuste): string => detalleAnulacion(a);
	protected readonly admiteAjuste = admiteAjuste;

	constructor() {
		this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
			const id = Number(params.get('estudianteId'));
			if (Number.isInteger(id) && id > 0) {
				this.facade.cargar(id);
			} else {
				this.seleccionado.set(null);
				this.facade.limpiar();
			}
		});
	}

	// #region Acciones sobre la cuenta
	protected abrirAnularPago(pago: CuentaPago): void {
		this.acciones.limpiarError();
		this.pendiente = { tipo: 'pago', id: pago.pagoId };
		this.anularDialog().open({
			titulo: `Anular pago N.º ${pago.pagoId}`,
			resumen: [`${fechaPagoDe(pago)} · ${MEDIOS[pago.medio] ?? pago.medio}`, `Monto: ${montoPagoDe(pago)}`, `Comprobante: ${pago.comprobante}`],
			aviso: avisoAnularPago(pago),
		});
	}

	protected abrirAnularAjuste(ajuste: CuentaAjuste): void {
		this.acciones.limpiarError();
		this.pendiente = { tipo: 'ajuste', id: ajuste.ajusteId };
		const cargo = this.facade.cuenta()?.cargos.find((c) => c.cargoId === ajuste.cargoId);
		this.anularDialog().open({
			titulo: 'Anular ajuste',
			resumen: [
				`${TIPOS_AJUSTE[ajuste.tipo] ?? ajuste.tipo} de ${formatSoles(ajuste.monto)}`,
				`Cargo: ${cargo ? conceptoDe(cargo) : `Cargo ${ajuste.cargoId}`}`,
				...(ajuste.motivo ? [`Motivo del ajuste: ${ajuste.motivo}`] : []),
			],
			aviso: null,
		});
	}

	protected abrirAjuste(cargo: CuentaCargo): void {
		this.acciones.limpiarError();
		this.ajusteDialog().open({ cargoId: cargo.cargoId, cargo: conceptoDe(cargo), tope: topeAjuste(cargo) });
	}

	protected confirmarAnulacion(motivo: string): void {
		const objetivo = this.pendiente;
		if (!objetivo) return;
		const alTerminar = (r: ResultadoAccion): void => this.terminar(r, this.anularDialog());
		if (objetivo.tipo === 'pago') this.acciones.anularPago(objetivo.id, motivo, alTerminar);
		else this.acciones.anularAjuste(objetivo.id, motivo, alTerminar);
	}

	protected confirmarAjuste(payload: RegistrarAjustePayload): void {
		this.acciones.registrarAjuste(payload, (r) => this.terminar(r, this.ajusteDialog()));
	}

	/** Éxito: cierra el diálogo. Éxito o cuenta desactualizada: recarga la cuenta completa, no una fila. */
	private terminar(r: ResultadoAccion, dialogo: { close(): void }): void {
		if (r.exito) {
			dialogo.close();
			this.pendiente = null;
		}
		if (r.recargar) this.facade.recargar();
	}

	protected cancelarAccion(): void {
		this.pendiente = null;
		this.acciones.limpiarError();
	}
	// #endregion

	protected buscarEstudiantes(evento: { query: string }): void {
		this.facade.buscarEstudiantes(evento.query);
	}

	protected elegirEstudiante(estudiante: EstudianteBusqueda): void {
		this.seleccionado.set(estudiante);
		void this.router.navigate(['/intranet/admin/pagos/estado-cuenta', estudiante.estudianteId]);
	}
}
