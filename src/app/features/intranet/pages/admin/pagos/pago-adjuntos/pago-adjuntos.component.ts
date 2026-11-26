// #region Imports
import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { formatFileSize } from '@core/helpers';
import type { PagoAdjunto } from '@data/models';
import { EduButton, EduMessage, EduTextarea } from '@edu-ui';
import { PagoAdjuntosFacade } from '../services/pago-adjuntos.facade';
import { formatFechaConDia } from '../utils/pagos-format.util';
// #endregion

/**
 * Panel del voucher de un pago (`INV-PG16`): elegir archivo o tomar foto (con vista previa antes de subir), ver o
 * descargar, y dar de baja con motivo. Requiere conexión; sin ella las acciones se deshabilitan con un mensaje.
 * Un pago anulado conserva sus vouchers como evidencia, pero no admite uno nuevo (`vigente = false`).
 */
@Component({
	selector: 'app-pago-adjuntos',
	standalone: true,
	imports: [FormsModule, EduButton, EduMessage, EduTextarea],
	providers: [PagoAdjuntosFacade],
	templateUrl: './pago-adjuntos.component.html',
	styleUrl: './pago-adjuntos.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PagoAdjuntosComponent {
	readonly pagoId = input.required<number>();
	/** `false` = pago anulado: se ven los vouchers, no se agregan. */
	readonly vigente = input(true);

	protected readonly facade = inject(PagoAdjuntosFacade);
	private readonly destroyRef = inject(DestroyRef);

	/** Archivo elegido que todavía no se subió. */
	protected readonly seleccionado = signal<File | null>(null);
	protected readonly vistaPrevia = signal<string | null>(null);
	/** Adjunto cuya baja se está confirmando, y su motivo. */
	protected readonly bajaDe = signal<number | null>(null);
	protected readonly motivo = signal('');
	/** En pantallas táctiles se ofrece la cámara; en escritorio `capture` no hace nada útil. */
	protected readonly esTactil = typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches;
	protected readonly formatFileSize = formatFileSize;

	constructor() {
		effect(() => {
			const id = this.pagoId();
			untracked(() => {
				this.descartar();
				this.cancelarBaja();
				this.facade.cargar(id);
			});
		});
		this.destroyRef.onDestroy(() => this.soltarVistaPrevia());
	}

	protected elegir(evento: Event): void {
		const entrada = evento.target as HTMLInputElement;
		const archivo = entrada.files?.[0] ?? null;
		entrada.value = '';
		if (!archivo) return;
		this.descartar();
		if (!this.facade.validar(archivo)) return;
		this.seleccionado.set(archivo);
		if (archivo.type.startsWith('image/')) this.vistaPrevia.set(window.URL.createObjectURL(archivo));
	}

	protected subir(): void {
		const archivo = this.seleccionado();
		if (!archivo) return;
		// Si falla, el archivo elegido queda en pantalla para reintentar.
		this.facade.subir(archivo, () => this.descartar());
	}

	protected descartar(): void {
		this.soltarVistaPrevia();
		this.seleccionado.set(null);
	}

	protected pedirBaja(adjunto: PagoAdjunto): void {
		this.facade.limpiarError();
		this.motivo.set('');
		this.bajaDe.set(adjunto.id);
	}

	protected cancelarBaja(): void {
		this.bajaDe.set(null);
		this.motivo.set('');
	}

	protected confirmarBaja(adjunto: PagoAdjunto): void {
		this.facade.darDeBaja(adjunto, this.motivo(), () => this.cancelarBaja());
	}

	protected fecha(adjunto: PagoAdjunto): string {
		return formatFechaConDia(adjunto.fechaReg.slice(0, 10));
	}

	private soltarVistaPrevia(): void {
		const url = this.vistaPrevia();
		if (url) window.URL.revokeObjectURL(url);
		this.vistaPrevia.set(null);
	}
}
