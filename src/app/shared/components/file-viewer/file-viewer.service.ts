import { Injectable, inject, signal } from '@angular/core';
import { CapacitorService } from '@core/services';
import { InlineViewKind, logger, resolveInlineViewKind } from '@core/helpers';

// #region Tipos
export interface FileViewerFile {
	name: string;
	url: string;
	mimeType?: string | null;
}

/** Forma común de los DTO de archivo del backend (curso, entrega, material). */
export interface ViewableArchivo {
	nombreArchivo: string;
	urlArchivo: string;
	tipoArchivo: string | null;
}

export interface FileViewerState extends FileViewerFile {
	kind: InlineViewKind;
}
// #endregion

const MOBILE_QUERY = '(max-width: 768px)';

/**
 * Punto único para abrir un archivo desde la UI. Imagen y PDF se muestran en el visor in-app
 * (`app-file-viewer`, montado una vez en el shell); cualquier otro tipo — o un entorno donde
 * el embebido no sirve (Capacitor, pantalla chica) — se abre en pestaña nueva como antes.
 *
 * Solo recibe una `url` ya resuelta: no deriva rutas del blob ni asume que sea permanente,
 * de modo que pasar a URLs firmadas (SAS) no requiere tocar este servicio ni a los consumidores.
 */
@Injectable({ providedIn: 'root' })
export class FileViewerService {
	private readonly capacitor = inject(CapacitorService);

	private readonly _current = signal<FileViewerState | null>(null);
	readonly current = this._current.asReadonly();

	open(file: FileViewerFile): void {
		const kind = resolveInlineViewKind({ mimeType: file.mimeType, fileName: file.name });
		if (kind && this.canEmbed()) {
			this._current.set({ ...file, kind });
			return;
		}
		this.openExternally(file.url);
	}

	openArchivo(archivo: ViewableArchivo): void {
		this.open({ name: archivo.nombreArchivo, url: archivo.urlArchivo, mimeType: archivo.tipoArchivo });
	}

	close(): void {
		this._current.set(null);
	}

	/** Única salida a pestaña nueva; rechaza esquemas que no sean http(s). */
	openExternally(url: string): void {
		if (!this.isHttpUrl(url)) {
			logger.warn('FileViewer: URL no http(s), no se abre', url);
			return;
		}
		window.open(url, '_blank');
	}

	/** Visor solo donde el embebido funciona: web de escritorio. En nativo y móvil el PDF en `<iframe>` no pagina bien. */
	private canEmbed(): boolean {
		if (this.capacitor.isNative) return false;
		return !window.matchMedia?.(MOBILE_QUERY).matches;
	}

	private isHttpUrl(url: string): boolean {
		try {
			const { protocol } = new URL(url, window.location.href);
			return protocol === 'https:' || protocol === 'http:';
		} catch {
			return false;
		}
	}
}
