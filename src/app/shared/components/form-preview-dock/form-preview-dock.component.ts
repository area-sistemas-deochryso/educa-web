import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import {
	ChangeDetectionStrategy,
	Component,
	OnDestroy,
	TemplateRef,
	ViewContainerRef,
	ViewEncapsulation,
	effect,
	inject,
	input,
	viewChild,
} from '@angular/core';

// #region Implementation
/**
 * Vista previa flotante a la izquierda de un panel lateral (`edu-drawer` a la derecha): ocupa el espacio
 * libre, centrada y siempre visible, sin quitarle ancho al formulario.
 *
 * Vive en su propia capa CDK porque el panel y su fondo oscuro están en la capa superior del navegador
 * (popover); un elemento normal de la página quedaría tapado. Se abre después del panel para quedar encima
 * y no captura el puntero: un clic sobre ella llega al fondo, igual que en el resto de la pantalla.
 * Declárala DESPUÉS del `edu-drawer` en la plantilla.
 */
@Component({
	selector: 'app-form-preview-dock',
	standalone: true,
	template: `
		<ng-template #overlayTemplate>
			<div class="fpd" role="region" [attr.aria-label]="heading()">
				<p class="fpd__label">{{ heading() }}</p>
				<ng-content />
				@if (hint()) {
					<p class="fpd__hint">{{ hint() }}</p>
				}
			</div>
		</ng-template>
	`,
	styleUrl: './form-preview-dock.component.scss',
	// El panel se pinta fuera de este componente (contenedor de overlays), así que sus estilos no pueden ser encapsulados.
	encapsulation: ViewEncapsulation.None,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormPreviewDockComponent implements OnDestroy {
	readonly visible = input(false);
	readonly heading = input('Vista previa');
	readonly hint = input('');
	/** Ancho (px) del panel lateral de la derecha; la vista previa centra en lo que queda a su izquierda. */
	readonly rightOffset = input(520);

	private readonly overlay = inject(Overlay);
	private readonly viewContainerRef = inject(ViewContainerRef);
	private readonly overlayTemplateRef = viewChild.required<TemplateRef<unknown>>('overlayTemplate');
	private overlayRef: OverlayRef | null = null;

	constructor() {
		effect(() => {
			if (this.visible()) {
				// Un tick después: el panel debe haber entrado primero a la capa superior para que esta quede encima.
				queueMicrotask(() => {
					if (this.visible()) this.open();
				});
			} else {
				this.close();
			}
		});
	}

	ngOnDestroy(): void {
		this.close();
	}

	private open(): void {
		if (this.overlayRef) return;

		this.overlayRef = this.overlay.create({
			positionStrategy: this.overlay.position().global().left('0').top('0'),
			width: `calc(100% - ${this.rightOffset()}px)`,
			height: '100%',
			panelClass: 'fpd-pane',
			hasBackdrop: false,
			scrollStrategy: this.overlay.scrollStrategies.noop(),
		});
		this.overlayRef.attach(new TemplatePortal(this.overlayTemplateRef(), this.viewContainerRef));
	}

	private close(): void {
		this.overlayRef?.dispose();
		this.overlayRef = null;
	}
}
// #endregion
