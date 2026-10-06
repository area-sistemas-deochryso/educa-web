import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorHandlerService, WalFacadeHelper } from '@core/services';
import { FileViewerService, UPLOAD_LIMITS } from '@shared/components';
import { ProfesorApiService } from '@features/intranet/pages/profesor/services/profesor-api.service';
import { AttachmentsModalFacade } from './attachments-modal.facade';
import { AttachmentsModalStore } from './attachments-modal.store';

describe('AttachmentsModalFacade — validación de subida', () => {
	let facade: AttachmentsModalFacade;
	const api = { uploadFile: vi.fn() };
	const errorHandler = { showWarning: vi.fn(), showError: vi.fn(), showSuccess: vi.fn() };

	const file = (name: string, size = 1024) => new File([new Uint8Array(size)], name);

	beforeEach(() => {
		vi.clearAllMocks();
		TestBed.configureTestingModule({
			providers: [
				AttachmentsModalStore,
				AttachmentsModalFacade,
				{ provide: ProfesorApiService, useValue: api },
				{ provide: ErrorHandlerService, useValue: errorHandler },
				{ provide: WalFacadeHelper, useValue: { execute: vi.fn() } },
			],
		});
		facade = TestBed.inject(AttachmentsModalFacade);
	});

	it('rechaza un tipo no permitido con aviso y no sube', () => {
		facade.uploadFile(1, file('virus.exe'));
		expect(errorHandler.showWarning).toHaveBeenCalledWith('Archivo no válido', 'Tipo de archivo no permitido.');
		expect(api.uploadFile).not.toHaveBeenCalled();
	});

	it('rechaza un archivo sobre el tope con aviso y no sube', () => {
		facade.uploadFile(1, file('grande.pdf', UPLOAD_LIMITS.maxFileSizeBytes + 1));
		expect(errorHandler.showWarning).toHaveBeenCalledWith('Archivo no válido', 'El archivo supera el tamaño máximo de 100 MB.');
		expect(api.uploadFile).not.toHaveBeenCalled();
	});

	it('rechaza un archivo vacío', () => {
		facade.uploadFile(1, file('vacio.pdf', 0));
		expect(errorHandler.showWarning).toHaveBeenCalledWith('Archivo no válido', 'El archivo está vacío');
		expect(api.uploadFile).not.toHaveBeenCalled();
	});

	it('downloadAttachment marca como leído y delega la apertura en el visor compartido', () => {
		const viewer = TestBed.inject(FileViewerService);
		const openSpy = vi.spyOn(viewer, 'open').mockImplementation(() => undefined);
		const markSpy = vi.spyOn(facade, 'markAttachmentAsRead');
		const attachment = { id: 7, name: 'guia.pdf', mimeType: 'application/pdf', sizeBytes: 10, date: '', isRead: false, url: 'https://blob/guia.pdf' };

		facade.downloadAttachment(attachment);

		expect(markSpy).toHaveBeenCalledWith(7);
		expect(openSpy).toHaveBeenCalledWith({ name: 'guia.pdf', url: 'https://blob/guia.pdf', mimeType: 'application/pdf' });
	});

	it('downloadAttachment sin URL marca como leído y no abre el visor', () => {
		const openSpy = vi.spyOn(TestBed.inject(FileViewerService), 'open').mockImplementation(() => undefined);
		const markSpy = vi.spyOn(facade, 'markAttachmentAsRead');

		facade.downloadAttachment({ id: 8, name: 'x.pdf', mimeType: null, sizeBytes: null, date: '', isRead: false });

		expect(markSpy).toHaveBeenCalledWith(8);
		expect(openSpy).not.toHaveBeenCalled();
	});
});
