import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { EduButton, EduSkeleton } from '@edu-ui';
import { FotoFechaSelectorComponent } from '../foto-fecha/foto-fecha-selector.component';
import { MesesPagadosLeyendaComponent } from './meses-pagados-leyenda.component';
import { MesesPagadosTablaComponent } from './meses-pagados-tabla.component';
import { MesesPagadosFacade } from './meses-pagados.facade';

/**
 * «Meses pagados»: qué cuotas pagó cada alumno de un salón, a hoy o a un corte (xrepo-124 F2). Solo lectura.
 * La cifra al corte sale de la misma foto que el panel (INV-PG10); matrícula, inscripción y útiles son informativas (INV-PG19).
 */
@Component({
	selector: 'app-meses-pagados',
	standalone: true,
	imports: [
		EduButton,
		EduSkeleton,
		FotoFechaSelectorComponent,
		MesesPagadosTablaComponent,
		MesesPagadosLeyendaComponent,
	],
	providers: [MesesPagadosFacade],
	templateUrl: './meses-pagados.component.html',
	styleUrl: './meses-pagados.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MesesPagadosComponent {
	protected readonly facade = inject(MesesPagadosFacade);

	protected onSalon(event: Event): void {
		const value = (event.target as HTMLSelectElement).value;
		this.facade.setSalon(value === '' ? null : Number(value));
	}

	protected onSearch(event: Event): void {
		this.facade.onSearchInput((event.target as HTMLInputElement).value);
	}
}
