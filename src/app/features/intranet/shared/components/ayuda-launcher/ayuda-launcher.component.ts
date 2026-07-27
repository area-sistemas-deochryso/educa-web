// #region Imports
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CdkDragEnd, DragDropModule } from '@angular/cdk/drag-drop';

import { StorageService } from '@core/services';
// #endregion
// #region Implementation
/**
 * Botón flotante y arrastrable a la sección "Ayuda" (brief 485). Reemplaza el
 * link fijo en el header (desktop) y el ícono apretado entre logo/hamburger
 * (mobile) — ambos quedaban mal ubicados. Posición por defecto: bottom-left
 * (bottom-right ya lo ocupan Reportar y la campana de notificaciones). La
 * posición arrastrada persiste en `StorageService` y sobrevive a reloads. No
 * se confía únicamente en la supresión de click nativa de `cdkDrag` (poco
 * fiable con algunos inputs sintéticos/táctiles) — `onDragEnded` mide la
 * distancia real recorrida y `open()` descarta la navegación si superó un
 * umbral mínimo, así un tap simple navega y un arrastre real no navega.
 */
@Component({
	selector: 'app-ayuda-launcher',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [CommonModule, DragDropModule],
	template: `
		@if (visible()) {
			<button
				type="button"
				class="ayuda-fab"
				aria-label="Ayuda: preguntas frecuentes, tickets y salud de tu sede"
				title="Ayuda"
				cdkDrag
				cdkDragBoundary="body"
				[cdkDragFreeDragPosition]="dragPosition()"
				(cdkDragEnded)="onDragEnded($event)"
				(click)="open()"
			>
				<i class="pi pi-question-circle"></i>
				<span class="fab-label">Ayuda</span>
			</button>
		}
	`,
	styleUrl: './ayuda-launcher.component.scss',
})
export class AyudaLauncherComponent {
	private readonly router = inject(Router);
	private readonly storage = inject(StorageService);

	readonly suppressed = input<boolean>(false);

	readonly visible = computed(() => !this.suppressed());

	readonly dragPosition = signal(this.storage.getAyudaFabPosition() ?? { x: 0, y: 0 });

	/** Distancia (px) por debajo de la cual un gesto de pointer se trata como tap, no arrastre. */
	private static readonly DRAG_THRESHOLD_PX = 3;
	private wasDragged = false;

	onDragEnded(event: CdkDragEnd): void {
		const position = event.source.getFreeDragPosition();
		this.dragPosition.set(position);
		this.storage.setAyudaFabPosition(position);

		const { x, y } = event.distance;
		this.wasDragged = Math.abs(x) > AyudaLauncherComponent.DRAG_THRESHOLD_PX || Math.abs(y) > AyudaLauncherComponent.DRAG_THRESHOLD_PX;
	}

	open(): void {
		if (this.wasDragged) {
			this.wasDragged = false;
			return;
		}
		this.router.navigate(['/intranet/ayuda']);
	}
}
// #endregion
