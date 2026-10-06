import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CapacitorService } from '@core/services';
import { FileViewerComponent } from './file-viewer.component';
import { FileViewerService } from './file-viewer.service';

describe('FileViewerComponent', () => {
	let fixture: ComponentFixture<FileViewerComponent>;
	let service: FileViewerService;
	const overlay = () => document.querySelector('.cdk-overlay-container') as HTMLElement;

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [FileViewerComponent],
			providers: [{ provide: CapacitorService, useValue: { isNative: false } }],
		});
		vi.spyOn(window, 'matchMedia').mockImplementation(() => ({ matches: false }) as MediaQueryList);
		service = TestBed.inject(FileViewerService);
		fixture = TestBed.createComponent(FileViewerComponent);
		fixture.detectChanges();
	});

	async function flush(): Promise<void> {
		fixture.detectChanges();
		await fixture.whenStable();
		fixture.detectChanges();
	}

	it('imagen → renderiza <img> con alt = nombre', async () => {
		service.open({ name: 'foto.png', url: 'https://blob/foto.png', mimeType: 'image/png' });
		await flush();

		const img = overlay().querySelector('img.file-viewer__image') as HTMLImageElement | null;
		expect(img?.getAttribute('alt')).toBe('foto.png');
		expect(overlay().querySelector('iframe')).toBeNull();
	});

	it('PDF → renderiza el frame del PDF con title = nombre', async () => {
		service.open({ name: 'guia.pdf', url: 'https://blob/guia.pdf', mimeType: 'application/pdf' });
		await flush();

		const frame = overlay().querySelector('iframe.file-viewer__frame');
		expect(frame?.getAttribute('title')).toBe('guia.pdf');
		expect(overlay().querySelector('img')).toBeNull();
	});

	it('.docx → no abre visor', async () => {
		vi.spyOn(window, 'open').mockReturnValue(null);
		service.open({ name: 'informe.docx', url: 'https://blob/informe.docx', mimeType: null });
		await flush();

		expect(service.current()).toBeNull();
		expect(overlay()?.querySelector('.file-viewer__body') ?? null).toBeNull();
	});

	it('cerrar el diálogo limpia el estado del servicio', async () => {
		service.open({ name: 'foto.png', url: 'https://blob/foto.png', mimeType: 'image/png' });
		await flush();

		(overlay().querySelector('.edu-dialog-header__close') as HTMLButtonElement).click();
		await flush();

		expect(service.current()).toBeNull();
	});
});
