// #region Imports
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { CdkDragEnd, DragDropModule } from '@angular/cdk/drag-drop';
import { filter, map } from 'rxjs';

import { StorageService } from '@core/services';
import { FeedbackReportFacade } from '@core/services/feedback';
import { FeatureFlagsFacade } from '@core/services/feature-flags';
// #endregion
// #region Helpers
interface FabAction {
	key: 'ayuda' | 'reportar';
	label: string;
	icon: string;
	run: () => void;
}
// #endregion
// #region Implementation
/**
 * FAB único (reemplaza brief 485 + su contraparte de Reportar): fusiona "Ayuda" y
 * "Reportar" en un solo control para que ninguno de los dos tape controles reales
 * cerca del borde inferior (hallazgo 01, auditoría /intranet/ayuda). Con una sola
 * acción disponible el botón la ejecuta directo; con dos, se comporta como
 * speed-dial. La acción "Ayuda" se excluye estando ya en /intranet/ayuda/* — ahí
 * ese acceso es redundante (hallazgo 02).
 */
@Component({
	selector: 'app-intranet-fab-menu',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [CommonModule, DragDropModule],
	template: `
		@if (visible()) {
			<div
				class="fab-menu"
				cdkDrag
				cdkDragBoundary="body"
				[cdkDragFreeDragPosition]="dragPosition()"
				(cdkDragEnded)="onDragEnded($event)"
			>
				@if (actions().length > 1 && expanded()) {
					<div class="fab-menu__actions">
						@for (action of actions(); track action.key) {
							<button type="button" class="fab-menu__chip" (click)="run(action)">
								<i [class]="action.icon"></i>
								<span class="fab-menu__chip-label">{{ action.label }}</span>
							</button>
						}
					</div>
				}
				<button
					type="button"
					class="fab-menu__trigger"
					[class.fab-menu__trigger--ayuda]="soloAyuda()"
					[attr.aria-label]="triggerAriaLabel()"
					[attr.aria-expanded]="actions().length > 1 ? expanded() : null"
					[title]="triggerAriaLabel()"
					cdkDragHandle
					(click)="onTriggerClick()"
				>
					@if (actions().length === 1) {
						<i [class]="actions()[0].icon"></i>
						<span class="fab-label">{{ actions()[0].label }}</span>
					} @else {
						<i class="pi" [class.pi-plus]="!expanded()" [class.pi-times]="expanded()"></i>
						<span class="fab-label">Acciones</span>
					}
				</button>
			</div>
		}
	`,
	styleUrl: './intranet-fab-menu.component.scss',
})
export class IntranetFabMenuComponent {
	private readonly router = inject(Router);
	private readonly storage = inject(StorageService);
	private readonly feedbackFacade = inject(FeedbackReportFacade);
	private readonly flags = inject(FeatureFlagsFacade);

	readonly suppressed = input<boolean>(false);

	private readonly currentUrl = toSignal(
		this.router.events.pipe(
			filter((e): e is NavigationEnd => e instanceof NavigationEnd),
			map((e) => e.urlAfterRedirects),
		),
		{ initialValue: this.router.url },
	);

	readonly actions = computed((): FabAction[] => {
		const list: FabAction[] = [];
		if (!this.currentUrl().startsWith('/intranet/ayuda')) {
			list.push({
				key: 'ayuda',
				label: 'Ayuda',
				icon: 'pi pi-question-circle',
				run: () => this.router.navigate(['/intranet/ayuda']),
			});
		}
		if (this.flags.isEnabled('feedbackReport') && !this.feedbackFacade.vm().dialogVisible) {
			list.push({
				key: 'reportar',
				label: 'Reportar',
				icon: 'pi pi-megaphone',
				run: () => this.feedbackFacade.open(),
			});
		}
		return list;
	});

	readonly visible = computed(() => !this.suppressed() && this.actions().length > 0);
	readonly soloAyuda = computed(() => this.actions().length === 1 && this.actions()[0].key === 'ayuda');

	readonly triggerAriaLabel = computed(() => {
		const list = this.actions();
		if (list.length === 1) {
			return list[0].key === 'ayuda'
				? 'Ayuda: preguntas frecuentes, tickets y salud de tu sede'
				: 'Reportar un problema (Ctrl+Alt+F)';
		}
		return this.expanded() ? 'Cerrar menú de acciones' : 'Abrir menú de acciones: Ayuda y Reportar';
	});

	readonly expanded = signal(false);
	readonly dragPosition = signal(this.storage.getAyudaFabPosition() ?? { x: 0, y: 0 });

	/** Distancia (px) por debajo de la cual un gesto de pointer se trata como tap, no arrastre. */
	private static readonly DRAG_THRESHOLD_PX = 3;
	private wasDragged = false;

	constructor() {
		// Si el set de acciones cambia (navegación a /ayuda, dialog de reporte se abre)
		// mientras el menú estaba expandido, lo cerramos para no dejar un chip huérfano.
		effect(() => {
			this.actions();
			this.expanded.set(false);
		});
	}

	onDragEnded(event: CdkDragEnd): void {
		const position = event.source.getFreeDragPosition();
		this.dragPosition.set(position);
		this.storage.setAyudaFabPosition(position);

		const { x, y } = event.distance;
		this.wasDragged =
			Math.abs(x) > IntranetFabMenuComponent.DRAG_THRESHOLD_PX || Math.abs(y) > IntranetFabMenuComponent.DRAG_THRESHOLD_PX;
	}

	onTriggerClick(): void {
		if (this.wasDragged) {
			this.wasDragged = false;
			return;
		}
		const list = this.actions();
		if (list.length === 1) {
			list[0].run();
			return;
		}
		this.expanded.update((v) => !v);
	}

	run(action: FabAction): void {
		action.run();
		this.expanded.set(false);
	}
}
// #endregion
