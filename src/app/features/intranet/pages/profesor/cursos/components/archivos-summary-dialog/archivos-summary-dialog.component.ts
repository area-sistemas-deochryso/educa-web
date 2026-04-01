import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { CursoContenidoSemanaDto } from '../../../models';
import { FormatFileSizePipe } from '@shared/pipes';

@Component({
	selector: 'app-archivos-summary-dialog',
	standalone: true,
	imports: [CommonModule, DialogModule, FormatFileSizePipe],
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

	getFileIcon(tipoArchivo: string | null): string {
		if (!tipoArchivo) return 'pi pi-file';
		if (tipoArchivo.includes('pdf')) return 'pi pi-file-pdf';
		if (tipoArchivo.includes('image')) return 'pi pi-image';
		if (tipoArchivo.includes('video')) return 'pi pi-video';
		if (tipoArchivo.includes('word') || tipoArchivo.includes('document')) return 'pi pi-file-word';
		if (tipoArchivo.includes('excel') || tipoArchivo.includes('sheet')) return 'pi pi-file-excel';
		return 'pi pi-file';
	}

	getFileIconClass(tipoArchivo: string | null): string {
		if (!tipoArchivo) return 'generic';
		if (tipoArchivo.includes('pdf')) return 'pdf';
		if (tipoArchivo.includes('image')) return 'image';
		if (tipoArchivo.includes('video')) return 'video';
		if (tipoArchivo.includes('word') || tipoArchivo.includes('document')) return 'word';
		if (tipoArchivo.includes('excel') || tipoArchivo.includes('sheet')) return 'excel';
		return 'generic';
	}

}
