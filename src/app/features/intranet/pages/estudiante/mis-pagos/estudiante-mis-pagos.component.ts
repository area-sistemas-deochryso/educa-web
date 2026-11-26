import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';

import { EmptyStateComponent, PageHeaderComponent } from '@intranet-shared/components';
import { SkeletonLoaderComponent } from '@shared/components';
import { EduButton, EduTag } from '@edu-ui';
import {
	esEnRevision,
	estaVacio,
	etiquetaEstado,
	etiquetaVigencia,
	formatFecha,
	formatHora,
	formatSoles,
	medioDe,
	textoEnRevision,
	tituloCargo,
} from './mis-pagos.logic';
import { MisPagosFacade } from './services/mis-pagos.facade';

/**
 * «Mis pagos» del estudiante (xrepo-124 F8): vista de solo lectura de su propia cuenta (INV-PG17).
 * Sin acciones de escritura: no se paga, anula, adjunta ni descarga nada (todo eso es del colegio).
 * Móvil primero: las cuotas van como tarjetas, no como tabla ancha.
 */
@Component({
	selector: 'app-estudiante-mis-pagos',
	standalone: true,
	imports: [EduButton, EduTag, PageHeaderComponent, EmptyStateComponent, SkeletonLoaderComponent],
	providers: [MisPagosFacade],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './estudiante-mis-pagos.component.html',
	styleUrl: './estudiante-mis-pagos.component.scss',
})
export class EstudianteMisPagosComponent implements OnInit {
	protected readonly facade = inject(MisPagosFacade);

	protected readonly vacio = computed(() => {
		const cuenta = this.facade.cuenta();
		return cuenta ? estaVacio(cuenta) : false;
	});

	// Funciones puras expuestas al template.
	protected readonly soles = formatSoles;
	protected readonly fecha = formatFecha;
	protected readonly hora = formatHora;
	protected readonly medio = medioDe;
	protected readonly titulo = tituloCargo;
	protected readonly estado = etiquetaEstado;
	protected readonly vigencia = etiquetaVigencia;
	protected readonly enRevision = esEnRevision;
	protected readonly textoRevision = textoEnRevision;

	ngOnInit(): void {
		this.facade.cargar();
	}

	onRetry(): void {
		this.facade.cargar();
	}
}
