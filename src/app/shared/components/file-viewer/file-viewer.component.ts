import { ChangeDetectionStrategy, Component, computed, inject, signal, effect } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { EduButton, EduDialog } from '@edu-ui';
import { FileViewerService } from './file-viewer.service';

/**
 * Host del visor de archivos: se monta una sola vez (shell de la intranet) y reacciona al estado
 * de `FileViewerService`. Los consumidores nunca lo declaran, solo llaman `viewer.open(...)`.
 */
@Component({
	selector: 'app-file-viewer',
	standalone: true,
	imports: [EduDialog, EduButton],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './file-viewer.component.html',
	styleUrl: './file-viewer.component.scss',
})
export class FileViewerComponent {
	private readonly viewer = inject(FileViewerService);
	private readonly sanitizer = inject(DomSanitizer);

	protected readonly file = this.viewer.current;
	protected readonly visible = computed(() => this.file() !== null);
	protected readonly imageFailed = signal(false);

	// El servicio ya validó que es http(s); por eso es seguro marcarla como recurso confiable.
	protected readonly frameUrl = computed<SafeResourceUrl | null>(() => {
		const current = this.file();
		return current?.kind === 'pdf' ? this.sanitizer.bypassSecurityTrustResourceUrl(current.url) : null;
	});

	constructor() {
		effect(() => {
			this.file();
			this.imageFailed.set(false);
		});
	}

	protected onVisibleChange(visible: boolean): void {
		if (!visible) {
			this.viewer.close();
		}
	}

	protected openExternally(): void {
		const current = this.file();
		if (current) {
			this.viewer.openExternally(current.url);
		}
	}
}
