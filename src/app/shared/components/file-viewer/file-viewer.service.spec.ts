import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CapacitorService } from '@core/services';
import { FileViewerService } from './file-viewer.service';

describe('FileViewerService', () => {
	let service: FileViewerService;
	let openSpy: ReturnType<typeof vi.spyOn>;
	let isNative = false;
	let isMobile = false;

	beforeEach(() => {
		isNative = false;
		isMobile = false;
		TestBed.configureTestingModule({
			providers: [{ provide: CapacitorService, useValue: { get isNative() { return isNative; } } }],
		});
		service = TestBed.inject(FileViewerService);
		openSpy = vi.spyOn(window, 'open').mockReturnValue(null);
		vi.spyOn(window, 'matchMedia').mockImplementation(() => ({ matches: isMobile }) as MediaQueryList);
	});

	afterEach(() => vi.restoreAllMocks());

	it('imagen → abre el visor y no sale a pestaña', () => {
		service.open({ name: 'foto.png', url: 'https://blob/foto.png', mimeType: 'image/png' });

		expect(service.current()).toMatchObject({ name: 'foto.png', kind: 'image' });
		expect(openSpy).not.toHaveBeenCalled();
	});

	it('PDF → abre el visor', () => {
		service.open({ name: 'guia.pdf', url: 'https://blob/guia.pdf', mimeType: 'application/pdf' });

		expect(service.current()?.kind).toBe('pdf');
	});

	it.each([
		['informe.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
		['datos.zip', 'application/zip'],
		['clase.mp4', 'video/mp4'],
		['logo.svg', 'image/svg+xml'],
	])('%s → no abre el visor, cae a pestaña nueva', (name, mimeType) => {
		service.open({ name, url: `https://blob/${name}`, mimeType });

		expect(service.current()).toBeNull();
		expect(openSpy).toHaveBeenCalledWith(`https://blob/${name}`, '_blank');
	});

	it('en Capacitor un PDF cae a pestaña nueva', () => {
		isNative = true;
		service.open({ name: 'guia.pdf', url: 'https://blob/guia.pdf', mimeType: 'application/pdf' });

		expect(service.current()).toBeNull();
		expect(openSpy).toHaveBeenCalledOnce();
	});

	it('en pantalla chica un PDF cae a pestaña nueva', () => {
		isMobile = true;
		service.open({ name: 'guia.pdf', url: 'https://blob/guia.pdf', mimeType: 'application/pdf' });

		expect(service.current()).toBeNull();
		expect(openSpy).toHaveBeenCalledOnce();
	});

	it('openExternally rechaza esquemas que no son http(s)', () => {
		service.openExternally('javascript:alert(1)');

		expect(openSpy).not.toHaveBeenCalled();
	});

	it('openArchivo mapea el DTO del backend a name/url/mimeType', () => {
		service.openArchivo({ nombreArchivo: 'a.png', urlArchivo: 'https://blob/a.png', tipoArchivo: 'image/png' });

		expect(service.current()).toMatchObject({ name: 'a.png', url: 'https://blob/a.png', mimeType: 'image/png' });
	});

	it('close limpia el estado', () => {
		service.open({ name: 'a.png', url: 'https://blob/a.png', mimeType: 'image/png' });
		service.close();

		expect(service.current()).toBeNull();
	});
});
