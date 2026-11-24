// #region Imports
import {
	ChangeDetectionStrategy,
	Component,
	ElementRef,
	Injector,
	afterNextRender,
	effect,
	inject,
	input,
	untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { EduButton, EduConfirmationService, EduInputText, EduMessage, EduTag } from '@edu-ui';
import { MontosAnioFacade } from './montos-anio.facade';
// #endregion

/**
 * Paso 2 de «Configurar año»: montos por concepto y nivel (P123 F3, INV-PG06). Grilla editable → revisión con el
 * resumen exacto de lo que se envía → guardado server-confirmed. El estado vive en `MontosAnioFacade`, que provee el
 * padre junto con `EduConfirmationService` y su `<edu-confirm-dialog />`.
 */
@Component({
	selector: 'app-montos-anio',
	standalone: true,
	imports: [FormsModule, EduButton, EduInputText, EduMessage, EduTag],
	templateUrl: './montos-anio.component.html',
	styleUrls: ['./configurar-anio.component.scss', './montos-anio.component.scss'],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MontosAnioComponent {
	readonly anio = input.required<number>();
	protected readonly facade = inject(MontosAnioFacade);
	private readonly confirmacion = inject(EduConfirmationService);
	private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
	private readonly injector = inject(Injector);
	private enRevision = false;

	constructor() {
		effect(() => {
			const anio = this.anio();
			untracked(() => this.facade.cargar(anio));
		});
		// Al salir de la revisión (seguir editando, guardado o error) desaparece el botón que tenía el foco: vuelve al
		// título. Un cambio de año también la cierra, pero ahí la sección recarga y el foco no se mueve.
		effect(() => {
			const enRevision = this.facade.revision() !== null;
			untracked(() => {
				const salio = this.enRevision && !enRevision;
				this.enRevision = enRevision;
				if (salio && this.facade.estado() === 'lista') this.enfocar('montos-title');
			});
		});
	}

	protected revisar(): void {
		if (this.facade.revisar()) this.enfocar('montos-revision-title');
	}

	/** «Volver a cargar» y «Volver a leer» desaparecen al usarlos: el foco pasa al título, no al inicio de la página. */
	protected recargar(): void {
		this.facade.recargar();
		this.enfocar('montos-title');
	}

	protected volverALeer(): void {
		this.facade.volverALeer();
		this.enfocar('montos-title');
	}

	protected descartar(): void {
		this.confirmacion.confirm({
			header: 'Descartar cambios',
			message: 'Se perderán los montos que escribiste y no guardaste.',
			icon: 'pi pi-exclamation-triangle',
			acceptLabel: 'Descartar',
			rejectLabel: 'Seguir editando',
			acceptButtonSeverity: 'danger',
			accept: () => {
				this.facade.descartar();
				this.enfocar('montos-title');
			},
		});
	}

	private enfocar(id: string): void {
		const darFoco = () => this.host.nativeElement.querySelector<HTMLElement>(`#${id}`)?.focus();
		afterNextRender(darFoco, { injector: this.injector });
	}
}
