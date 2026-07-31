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
import { FabMenuVisibilityService } from '@intranet-shared/services';
// #endregion
// #region Helpers
interface FabAction {
	key: 'ayuda' | 'reportar' | 'ocultar';
	label: string;
	icon: string;
	run: () => void;
}
// #endregion
// #region Implementation
/**
 * FAB único (reemplaza brief 485 + su contraparte de Reportar): fusiona "Ayuda" y
 * "Reportar" en un solo control para que ninguno de los dos tape controles reales
 * cerca del borde inferior (hallazgo 01, auditoría /intranet/ayuda). Se comporta
 * como speed-dial: colapsado muestra "Acciones", expandido lista las acciones
 * disponibles más "Ocultar" (siempre al final). La acción "Ayuda" se excluye
 * estando ya en /intranet/ayuda/* — ahí ese acceso es redundante (hallazgo 02).
 * "Ocultar" persiste vía `FabMenuVisibilityService`; se recupera desde el menú
 * de usuario ("Mostrar accesos flotantes").
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
				@if (expanded()) {
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
					[attr.aria-label]="triggerAriaLabel()"
					[attr.aria-expanded]="expanded()"
					[title]="triggerAriaLabel()"
					cdkDragHandle
					(click)="onTriggerClick()"
				>
					<i class="pi" [class.pi-plus]="!expanded()" [class.pi-times]="expanded()"></i>
					<span class="fab-label">Acciones</span>
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
	private readonly visibility = inject(FabMenuVisibilityService);

	readonly suppressed = input<boolean>(false);

	private readonly currentUrl = toSignal(
		this.router.events.pipe(
			filter((e): e is NavigationEnd => e instanceof NavigationEnd),
			map((e) => e.urlAfterRedirects),
		),
		{ initialValue: this.router.url },
	);

	private readonly primaryActions = computed((): FabAction[] => {
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

	readonly actions = computed((): FabAction[] => {
		const primary = this.primaryActions();
		if (primary.length === 0) return [];
		return [
			...primary,
			{
				key: 'ocultar',
				label: 'Ocultar',
				icon: 'pi pi-eye-slash',
				run: () => this.visibility.hide(),
			},
		];
	});

	readonly visible = computed(() => !this.suppressed() && !this.visibility.hidden() && this.primaryActions().length > 0);

	readonly triggerAriaLabel = computed(() =>
		this.expanded() ? 'Cerrar menú de accesos rápidos' : 'Abrir menú de accesos rápidos: Ayuda, Reportar y Ocultar',
	);

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
		this.expanded.update((v) => !v);
	}

	run(action: FabAction): void {
		action.run();
		this.expanded.set(false);
	}
}
// #endregion
