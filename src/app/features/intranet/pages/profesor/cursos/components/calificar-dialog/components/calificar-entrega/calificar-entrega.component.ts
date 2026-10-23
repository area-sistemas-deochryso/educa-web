import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ESTADO_ENTREGA, EntregaArchivoDto, EntregaCalificacionDto, EstadoEntrega } from '@features/intranet/pages/profesor/models';
import { FileRowComponent, FileViewerService } from '@shared/components';
import { EduTag } from '@edu-ui';

type EntregaSeverity = 'success' | 'warn' | 'secondary';

const ESTADO_UI: Record<EstadoEntrega, { label: string; severity: EntregaSeverity; icon: string }> = {
	[ESTADO_ENTREGA.Pendiente]: { label: 'Sin entregar', severity: 'secondary', icon: 'pi pi-times-circle' },
	[ESTADO_ENTREGA.Entregado]: { label: 'Entregado', severity: 'success', icon: 'pi pi-check-circle' },
	[ESTADO_ENTREGA.Tardio]: { label: 'Entrega tardía', severity: 'warn', icon: 'pi pi-clock' },
};

/**
 * Estado, fecha y archivos abribles de la entrega de la tarea enlazada (INV-C18), junto a la nota.
 * En evaluación grupal recibe la entrega del grupo y `autores` rotula el archivo con quien lo subió.
 */
@Component({
	selector: 'app-calificar-entrega',
	standalone: true,
	imports: [DatePipe, EduTag, FileRowComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './calificar-entrega.component.html',
	styleUrl: './calificar-entrega.component.scss',
})
export class CalificarEntregaComponent {
	private readonly viewer = inject(FileViewerService);

	// #region Inputs
	readonly entrega = input.required<EntregaCalificacionDto>();
	/** Miembros del grupo (id → nombre) para mostrar el autor de cada archivo; vacío en evaluación individual. */
	readonly autores = input<readonly { estudianteId: number; nombre: string }[]>([]);
	// #endregion

	readonly ui = computed(() => ESTADO_UI[this.entrega().estado]);

	autorDe(archivo: EntregaArchivoDto): string | null {
		return this.autores().find((a) => a.estudianteId === archivo.estudianteId)?.nombre ?? null;
	}

	openArchivo(archivo: EntregaArchivoDto): void {
		this.viewer.openArchivo(archivo);
	}
}
