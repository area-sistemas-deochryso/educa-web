// #region Imports
import { Component, ChangeDetectionStrategy, inject, OnInit, computed, signal, viewChild, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { FormsModule } from '@angular/forms';
import { resolveErrorMessage } from '@core/helpers';
import { ErrorHandlerService } from '@core/services';
import { PageHeaderComponent } from '@intranet-shared/components';
import { VideoconferenciasFacade } from './services/videoconferencias.facade';
import { EstadoSala, VideoconferenciaItem } from './services/videoconferencias.models';
import { resolveEstadoSala } from './services/videoconferencias.window.utils';
import { VideoconferenciaSalaComponent } from './components/videoconferencia-sala/videoconferencia-sala.component';
import { VideoconferenciaExcepcionDialogComponent } from './components/videoconferencia-excepcion-dialog/videoconferencia-excepcion-dialog.component';

// #endregion

@Component({
	selector: 'app-videoconferencias',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		ButtonModule,
		TagModule,
		TooltipModule,
		ProgressSpinnerModule,
		ToggleSwitchModule,
		PageHeaderComponent,
		VideoconferenciaSalaComponent,
		VideoconferenciaExcepcionDialogComponent,
	],
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
			case 'no-habilitada':
				return 'Sala no habilitada';
		}
	}

	estadoSeverity(item: VideoconferenciaItem): 'success' | 'warn' | 'danger' {
		switch (this.estadoDe(item)) {
			case 'disponible':
				return 'success';
			case 'fuera-de-horario':
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

	onToggleHabilitacion(item: VideoconferenciaItem, habilitada: boolean): void {
		this.savingHabilitacion.update((s) => new Set(s).add(item.horarioId));

		this.facade
			.setHabilitacion(item.horarioId, habilitada)
			.pipe(
				finalize(() =>
					this.savingHabilitacion.update((s) => {
						const next = new Set(s);
						next.delete(item.horarioId);
						return next;
					}),
				),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe({
				next: (nuevoValor) => this.facade.applyHabilitacionLocal(item.horarioId, nuevoValor),
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
