// #region Imports
import { DatePipe } from '@angular/common';
import { Component, ChangeDetectionStrategy, inject, OnInit, computed, signal, viewChild, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { timer } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import { resolveErrorMessage } from '@core/helpers';
import { ErrorHandlerService } from '@core/services';
import { PageHeaderComponent } from '@intranet-shared/components';
import { VideoconferenciasFacade } from './services/videoconferencias.facade';
import { AperturaSalaRequest, EstadoSala, VideoconferenciaItem } from './services/videoconferencias.models';
import { estaFueraDeHorarioDeClase, resolveEstadoSala } from './services/videoconferencias.window.utils';
import { VideoconferenciaSalaComponent } from './components/videoconferencia-sala/videoconferencia-sala.component';
import { VideoconferenciaExcepcionDialogComponent } from './components/videoconferencia-excepcion-dialog/videoconferencia-excepcion-dialog.component';
import { VideoconferenciaAperturaDialogComponent } from './components/videoconferencia-apertura-dialog/videoconferencia-apertura-dialog.component';
import { EduButton, EduSpinner, EduTag, EduToggle, EduTooltip } from '@edu-ui';

// #endregion

/** Cada cuánto se relee el estado de apertura (presencia del profesor / intervalo vigente lo evalúa el BE). */
const REFRESH_INTERVAL_MS = 30_000;

@Component({
	selector: 'app-videoconferencias',
	standalone: true,
	imports: [
		FormsModule,
		DatePipe,
		EduButton,
		EduTag,
		EduTooltip,
		EduSpinner,
		EduToggle,
		PageHeaderComponent,
		VideoconferenciaSalaComponent,
		VideoconferenciaExcepcionDialogComponent,
		VideoconferenciaAperturaDialogComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './videoconferencias.component.html',
	styleUrl: './videoconferencias.component.scss',
})
export class VideoconferenciasComponent implements OnInit {
	// #region Dependencias
	private readonly facade = inject(VideoconferenciasFacade);
	private readonly errorHandler = inject(ErrorHandlerService);
	private readonly destroyRef = inject(DestroyRef);
	// #endregion

	// #region Estado del facade
	readonly vm = this.facade.vm;
	readonly isModerator = this.facade.isModerator;
	// #endregion

	// #region Estado local
	readonly excepcionDialog = viewChild(VideoconferenciaExcepcionDialogComponent);
	readonly excepcionSaving = signal(false);
	readonly savingHabilitacion = signal<ReadonlySet<number>>(new Set());
	private excepcionItem: VideoconferenciaItem | null = null;

	readonly aperturaDialog = viewChild(VideoconferenciaAperturaDialogComponent);
	readonly aperturaSaving = signal(false);
	/** Horario cuyo toggle el profesor acaba de encender y espera la confirmación del diálogo de apertura. */
	readonly pendingApertura = signal<number | null>(null);
	private aperturaItem: VideoconferenciaItem | null = null;
	// #endregion

	// #region Computed locales
	readonly activeRoomName = computed(() => {
		const sala = this.vm().activeSala;
		if (!sala) return '';
		return this.facade.getRoomName(sala.horarioId, sala.cursoNombre);
	});
	// #endregion

	// #region Lifecycle
	ngOnInit(): void {
		this.facade.loadCursos();

		timer(REFRESH_INTERVAL_MS, REFRESH_INTERVAL_MS)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(() => {
				if (!this.vm().inSala) this.facade.refreshCursos();
			});
	}
	// #endregion

	// #region Estado de la sala (antes del click)
	estadoDe(item: VideoconferenciaItem): EstadoSala {
		return resolveEstadoSala(item, this.isModerator());
	}

	estadoLabel(item: VideoconferenciaItem): string {
		switch (this.estadoDe(item)) {
			case 'disponible':
				return 'Disponible ahora';
			case 'fuera-de-horario':
				return 'Fuera de horario';
			case 'esperando-apertura':
				return 'Esperando al profesor';
			case 'no-habilitada':
				return 'Sala no habilitada';
		}
	}

	estadoSeverity(item: VideoconferenciaItem): 'success' | 'warn' | 'danger' {
		switch (this.estadoDe(item)) {
			case 'disponible':
				return 'success';
			case 'fuera-de-horario':
			case 'esperando-apertura':
				return 'warn';
			case 'no-habilitada':
				return 'danger';
		}
	}

	isSavingHabilitacion(item: VideoconferenciaItem): boolean {
		return this.savingHabilitacion().has(item.horarioId);
	}
	// #endregion

	// #region Event handlers
	onRetry(): void {
		this.facade.loadCursos();
	}

	onUnirse(item: VideoconferenciaItem): void {
		this.facade.enterSala(item);
	}

	/** Valor del toggle: el servidor manda, salvo mientras el profesor completa el diálogo de apertura. */
	toggleValue(item: VideoconferenciaItem): boolean {
		return item.habilitada || this.pendingApertura() === item.horarioId;
	}

	onToggleHabilitacion(item: VideoconferenciaItem, habilitada: boolean): void {
		// Abrir fuera del horario de clase exige motivo (e intervalo opcional): se pide en el diálogo.
		if (habilitada && estaFueraDeHorarioDeClase(item)) {
			this.aperturaItem = item;
			this.pendingApertura.set(item.horarioId);
			this.aperturaDialog()?.open({ cursoNombre: item.cursoNombre });
			return;
		}

		this.guardarHabilitacion(item, habilitada);
	}

	onCerrarApertura(): void {
		this.pendingApertura.set(null);
		this.aperturaItem = null;
	}

	onConfirmarApertura(apertura: AperturaSalaRequest): void {
		const item = this.aperturaItem;
		if (!item) return;

		this.aperturaSaving.set(true);
		this.guardarHabilitacion(item, true, apertura, () => this.aperturaDialog()?.close(), () => this.aperturaSaving.set(false));
	}

	private guardarHabilitacion(
		item: VideoconferenciaItem,
		habilitada: boolean,
		apertura?: AperturaSalaRequest,
		onSuccess?: () => void,
		onFinalize?: () => void,
	): void {
		this.savingHabilitacion.update((s) => new Set(s).add(item.horarioId));

		this.facade
			.setHabilitacion(item.horarioId, habilitada, apertura)
			.pipe(
				finalize(() => {
					this.savingHabilitacion.update((s) => {
						const next = new Set(s);
						next.delete(item.horarioId);
						return next;
					});
					onFinalize?.();
				}),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe({
				next: (nuevoValor) => {
					this.facade.applyHabilitacionLocal(item.horarioId, nuevoValor);
					onSuccess?.();
					// El BE evalúa la apertura (presencia/intervalo): se relee para reflejar el estado real.
					this.facade.refreshCursos();
				},
				error: (err) => {
					const message = resolveErrorMessage(err, 'No se pudo cambiar el estado de la sala');
					this.errorHandler.showError('Error', message);
				},
			});
	}

	onSolicitarExcepcion(item: VideoconferenciaItem): void {
		this.excepcionItem = item;
		this.excepcionDialog()?.open({ cursoNombre: item.cursoNombre });
	}

	onConfirmarExcepcion(motivo: string): void {
		const item = this.excepcionItem;
		if (!item) return;

		const roomName = this.facade.getRoomName(item.horarioId, item.cursoNombre);
		this.excepcionSaving.set(true);

		this.facade
			.requestExcepcion(roomName, motivo)
			.pipe(finalize(() => this.excepcionSaving.set(false)), takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (token) => {
					this.excepcionDialog()?.close();
					this.facade.enterSalaConExcepcion(item, token);
				},
				error: (err) => {
					const message = resolveErrorMessage(err, 'No se pudo habilitar la excepción');
					this.errorHandler.showError('Error', message);
				},
			});
	}
	// #endregion
}
