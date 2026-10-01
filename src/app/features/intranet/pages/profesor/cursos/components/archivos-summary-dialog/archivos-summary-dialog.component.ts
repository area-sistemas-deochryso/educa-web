import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';

import { CursoContenidoSemanaDto } from '@features/intranet/pages/profesor/models';
import { FileRowComponent } from '@shared/components';
import { EduDialog } from '@edu-ui';

@Component({
	selector: 'app-archivos-summary-dialog',
	standalone: true,
	imports: [EduDialog, FileRowComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './archivos-summary-dialog.component.html',
	styleUrl: './archivos-summary-dialog.component.scss',
})
export class ArchivosSummaryDialogComponent {
	readonly visible = input<boolean>(false);
	readonly semanas = input<CursoContenidoSemanaDto[]>([]);
	readonly visibleChange = output<boolean>();

	readonly isEmpty = computed(() => this.semanas().every((s) => s.archivos.length === 0));

	onVisibleChange(value: boolean): void {
		if (!value) {
			this.visibleChange.emit(false);
		}
	}

	openArchivo(url: string): void {
		window.open(url, '_blank');
	}
}
