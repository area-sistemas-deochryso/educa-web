import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { EduTooltip } from '@edu-ui';
import { getFileKindMeta, formatFileSize } from '@core/helpers';

/**
 * Fila de archivo compartida: ícono por tipo, nombre truncado con tooltip, tamaño y slot de acciones.
 * `(open)` es el gancho para abrir/previsualizar; el consumidor decide qué hace (hoy delega en `FileViewerService`).
 */
@Component({
	selector: 'app-file-row',
	standalone: true,
	imports: [EduTooltip],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './file-row.component.html',
	styleUrl: './file-row.component.scss',
})
export class FileRowComponent {
	readonly name = input.required<string>();
	readonly mimeType = input<string | null>(null);
	readonly sizeBytes = input<number | null>(null);
	readonly small = input(false);

	readonly open = output<void>();

	protected readonly meta = computed(() => getFileKindMeta({ mimeType: this.mimeType(), fileName: this.name() }));
	protected readonly sizeLabel = computed(() => {
		const bytes = this.sizeBytes();
		return bytes ? formatFileSize(bytes) : null;
	});
}
