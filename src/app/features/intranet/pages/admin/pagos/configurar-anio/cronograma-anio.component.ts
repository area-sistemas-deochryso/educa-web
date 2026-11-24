// #region Imports
import { DOCUMENT } from '@angular/common';
import {
	ChangeDetectionStrategy,
	Component,
	Injector,
	afterNextRender,
	computed,
	effect,
	inject,
	input,
	untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { EduButton, EduConfirmationService, EduInputText, EduMessage } from '@edu-ui';
import { CronogramaAnioFacade } from './cronograma-anio.facade';
// #endregion

/**
 * Paso 3 de «Configurar año» (P123 F3, INV-PG05): las 10 cuotas de pensión, cada una con su etiqueta y su vencimiento.
 * Editar → revisar (el resumen reemplaza al editor y congela lo que viaja) → guardar. Las fechas se leen en vivo:
 * cambiar una mueve también las cuotas ya generadas, y el resumen lo advierte antes de guardar.
 * El facade y `EduConfirmationService` los provee `ConfigurarAnioComponent`.
 */
@Component({
	selector: 'app-cronograma-anio',
	standalone: true,
	imports: [FormsModule, EduButton, EduInputText, EduMessage],
	templateUrl: './cronograma-anio.component.html',
	styleUrls: ['./configurar-anio.component.scss', './cronograma-anio.component.scss'],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CronogramaAnioComponent {
	readonly anio = input.required<number>();
	protected readonly facade = inject(CronogramaAnioFacade);
	private readonly confirmacion = inject(EduConfirmationService);
	private readonly document = inject(DOCUMENT);
	private readonly injector = inject(Injector);
	private enRevision = false;

	/** Solo guían al selector nativo; la validación pura es la que manda. */
	protected readonly inicioAnio = computed(() => `${this.anio()}-01-01`);
	protected readonly finAnio = computed(() => `${this.anio()}-12-31`);

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
				if (salio && this.facade.estado() === 'lista') this.enfocar('cronograma-title');
			});
		});
	}

	// #region Handlers
	protected revisar(): void {
		if (this.facade.revisar()) this.enfocar('cronograma-revision-title');
	}

	/** «Volver a cargar» y «Volver a leer» desaparecen al usarlos: el foco pasa al título, no al inicio de la página. */
	protected recargar(): void {
		this.facade.recargar();
		this.enfocar('cronograma-title');
	}

	protected volverALeer(): void {
		this.facade.volverALeer();
		this.enfocar('cronograma-title');
	}

	/** El botón desaparece al no quedar fechas vacías: el foco pasa a la primera fecha propuesta para revisarla. */
	protected proponerFechas(): void {
		const primeraVacia = this.facade.filas().find((f) => f.fecha === '');
		this.facade.proponerFechas();
		if (primeraVacia) this.enfocar(primeraVacia.ids.fecha);
	}

	protected descartar(): void {
		this.confirmacion.confirm({
			header: 'Descartar cambios',
			message: 'Se perderán las etiquetas y fechas que escribiste y no guardaste.',
			icon: 'pi pi-exclamation-triangle',
			acceptLabel: 'Descartar',
			rejectLabel: 'Seguir editando',
			acceptButtonSeverity: 'danger',
			// «Descartar cambios» se oculta al no quedar cambios: el foco vuelve al título.
			accept: () => {
				this.facade.descartar();
				this.enfocar('cronograma-title');
			},
		});
	}

	private enfocar(id: string): void {
		afterNextRender(() => this.document.getElementById(id)?.focus(), {
			injector: this.injector,
		});
	}
	// #endregion
}
