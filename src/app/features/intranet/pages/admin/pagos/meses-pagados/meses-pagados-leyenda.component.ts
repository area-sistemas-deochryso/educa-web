import { ChangeDetectionStrategy, Component } from '@angular/core';

import type { MesesPagadosCelda } from '@data/models';
import { MesesPagadosCeldaComponent } from './meses-pagados-celda.component';
import { ESTADOS_LEYENDA, ESTADO_VISUAL } from './meses-pagados.logic';

interface ItemLeyenda {
	celda: MesesPagadosCelda;
	descripcion: string;
	nombre: string;
}

/** Leyenda de los 7 estados, con la misma celda que usa la matriz. Presentacional y sin entradas. */
@Component({
	selector: 'app-meses-pagados-leyenda',
	standalone: true,
	imports: [MesesPagadosCeldaComponent],
	template: `
		<section class="leyenda" aria-label="Leyenda de estados">
			<h3 class="leyenda__titulo">Cómo leer la matriz</h3>
			<ul class="leyenda__lista">
				@for (item of items; track item.nombre) {
					<li class="leyenda__item">
						<app-meses-pagados-celda [celda]="item.celda" [columna]="item.nombre" />
						<span class="leyenda__desc">{{ item.descripcion }}</span>
					</li>
				}
			</ul>
		</section>
	`,
	styleUrl: './meses-pagados-leyenda.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MesesPagadosLeyendaComponent {
	protected readonly items: ItemLeyenda[] = ESTADOS_LEYENDA.map((estado) => ({
		celda: { estado, saldo: 0 },
		descripcion: ESTADO_VISUAL[estado].descripcion,
		nombre: ESTADO_VISUAL[estado].texto,
	}));
}
