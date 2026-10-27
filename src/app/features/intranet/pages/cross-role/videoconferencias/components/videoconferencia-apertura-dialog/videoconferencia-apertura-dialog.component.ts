// #region Imports
import { ChangeDetectionStrategy, Component, computed, input, model, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EduButton, EduDatePicker, EduDialog, EduTextarea, EduToggle } from '@edu-ui';
import { AperturaSalaRequest } from '../../services/videoconferencias.models';
import { toLocalIso } from '../../services/videoconferencias.window.utils';

// #endregion

export interface AperturaContext {
	cursoNombre: string;
}

/** Duración por defecto del intervalo al activarlo (el profesor la ajusta). */
const DEFAULT_INTERVAL_MS = 60 * 60 * 1000;

@Component({
	selector: 'app-videoconferencia-apertura-dialog',
	standalone: true,
	imports: [FormsModule, EduDialog, EduButton, EduTextarea, EduDatePicker, EduToggle],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './videoconferencia-apertura-dialog.component.html',
	styleUrl: './videoconferencia-apertura-dialog.component.scss',
})
export class VideoconferenciaAperturaDialogComponent {
	// #region Inputs/Outputs
	readonly saving = input<boolean>(false);
	readonly visible = model<boolean>(false);
	readonly confirmar = output<AperturaSalaRequest>();
	/** Se cierra el diálogo (cancelado, ✕ o tras guardar): el padre libera el toggle pendiente. */
	readonly cerrado = output<void>();
	// #endregion

	// #region Estado local
	readonly context = signal<AperturaContext | null>(null);
	readonly motivoText = signal('');
	readonly usarIntervalo = signal(false);
	readonly desde = signal<Date | null>(null);
	readonly hasta = signal<Date | null>(null);
	// #endregion

	// #region Validación
	/** Mensaje del primer problema del intervalo, o null si es válido (o no se usa). */
	readonly intervaloError = computed(() => {
		if (!this.usarIntervalo()) return null;

		const desde = this.desde();
		const hasta = this.hasta();
		if (!desde || !hasta) return 'Indica el inicio y el fin del intervalo';
		if (hasta <= desde) return 'El fin debe ser posterior al inicio';
		if (hasta <= new Date()) return 'El intervalo ya terminó';
		return null;
	});

	readonly puedeConfirmar = computed(() => !!this.motivoText().trim() && this.intervaloError() === null);
	// #endregion

	// #region API pública
	open(ctx: AperturaContext): void {
		this.context.set(ctx);
		this.motivoText.set('');
		this.usarIntervalo.set(false);
		this.desde.set(null);
		this.hasta.set(null);
		this.visible.set(true);
	}

	close(): void {
		this.visible.set(false);
		this.context.set(null);
		this.cerrado.emit();
	}
	// #endregion

	// #region Event handlers
	onVisibleChange(val: boolean): void {
		if (!val) this.close();
	}

	onUsarIntervaloChange(usar: boolean): void {
		this.usarIntervalo.set(usar);
		if (usar && !this.desde()) {
			const ahora = new Date();
			this.desde.set(ahora);
			this.hasta.set(new Date(ahora.getTime() + DEFAULT_INTERVAL_MS));
		}
	}

	confirmarClick(): void {
		if (!this.puedeConfirmar()) return;

		const desde = this.usarIntervalo() ? this.desde() : null;
		const hasta = this.usarIntervalo() ? this.hasta() : null;
		this.confirmar.emit({
			desde: desde ? toLocalIso(desde) : null,
			hasta: hasta ? toLocalIso(hasta) : null,
			motivo: this.motivoText().trim(),
		});
	}
	// #endregion
}
