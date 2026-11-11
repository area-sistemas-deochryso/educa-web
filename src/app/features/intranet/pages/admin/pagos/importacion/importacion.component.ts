// #region Imports
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { EduButton, EduMessage, EduPaginator, EduSelect, EduTag } from '@edu-ui';
import type { EduPaginatorPageEvent } from '@edu-ui';
import { opcionesAnio } from '../utils/carga-inicial.logic';
import { ImportacionFacade } from './importacion.facade';
import {
	ESTADOS_VISTA,
	type EstadoVista,
	SEVERIDAD_ESTADO,
	cantidadFilas,
	conteoPorEstado,
	etiquetaEstado,
	filtrarPorEstado,
	pendientesDeResolver,
	resumenResultado,
} from './importacion.logic';
// #endregion

const FILAS_POR_PAGINA = 50;

/**
 * «Importar»: carga inicial desde la plantilla de Excel (P119 F6c). Se baja la plantilla, se sube ya normalizada,
 * se ve el estado de cada fila, se resuelve a mano lo ambiguo y recién entonces se confirma. Antes de confirmar
 * no se escribe nada; reimportar el mismo archivo es seguro (lo aplicado sale «Ya existe»).
 */
@Component({
	selector: 'app-importacion',
	standalone: true,
	imports: [FormsModule, EduButton, EduMessage, EduPaginator, EduSelect, EduTag],
	providers: [ImportacionFacade],
	templateUrl: './importacion.component.html',
	styleUrl: './importacion.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportacionComponent {
	protected readonly facade = inject(ImportacionFacade);

	protected readonly anios = opcionesAnio(new Date());
	protected readonly filasPorPagina = FILAS_POR_PAGINA;
	protected readonly etiqueta = etiquetaEstado;
	protected readonly severidad = SEVERIDAD_ESTADO;
	protected readonly cantidad = cantidadFilas;
	protected readonly resumen = resumenResultado;

	protected readonly filtro = signal<EstadoVista | null>(null);
	protected readonly first = signal(0);

	protected readonly conteo = computed(() => conteoPorEstado(this.facade.filasVista()));
	/** Solo los estados que aparecen en el archivo, en el orden del diseño. */
	protected readonly chips = computed(() =>
		ESTADOS_VISTA.map((e) => ({ ...e, cantidad: this.conteo().get(e.value) ?? 0 })).filter((e) => e.cantidad > 0),
	);
	protected readonly filtradas = computed(() => filtrarPorEstado(this.facade.filasVista(), this.filtro()));
	protected readonly pagina = computed(() => this.filtradas().slice(this.first(), this.first() + FILAS_POR_PAGINA));
	protected readonly pendientes = computed(() => pendientesDeResolver(this.facade.filasVista()));

	protected async onArchivo(event: Event): Promise<void> {
		const input = event.target as HTMLInputElement;
		const archivo = input.files?.[0];
		// Se limpia para que elegir de nuevo el mismo archivo (ya corregido) vuelva a disparar el cambio.
		input.value = '';
		if (!archivo) return;
		this.filtro.set(null);
		this.first.set(0);
		await this.facade.leerArchivo(archivo);
	}

	protected elegirFiltro(estado: EstadoVista | null): void {
		this.filtro.set(this.filtro() === estado ? null : estado);
		this.first.set(0);
	}

	protected onPage(event: EduPaginatorPageEvent): void {
		this.first.set(event.first);
	}

	protected reiniciar(): void {
		this.filtro.set(null);
		this.first.set(0);
		this.facade.reiniciar();
	}
}
