import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AttachmentsModalComponent } from './attachments-modal.component';
import { AttachmentsModalFacade } from './attachments-modal.facade';
import { AttachmentsModalStore } from './attachments-modal.store';
import type { Attachment } from './attachments-modal.models';

const attachments: Attachment[] = [
	{ id: 1, name: 'guia.pdf', mimeType: 'application/pdf', sizeBytes: 2048, date: '01/10/2026', isRead: false, url: 'https://blob/guia.pdf' },
	{ id: 2, name: 'foto.png', mimeType: null, sizeBytes: 5 * 1024 * 1024, date: '02/10/2026', isRead: true, url: 'https://blob/foto.png' },
];

describe('AttachmentsModalComponent', () => {
	let fixture: ComponentFixture<AttachmentsModalComponent>;
	const facade = {
		vm: signal({ attachments, uploading: false, totalCount: 2 }),
		downloadAttachment: vi.fn(),
		deleteAttachment: vi.fn(),
		uploadMultipleFiles: vi.fn(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
		TestBed.configureTestingModule({ imports: [AttachmentsModalComponent] }).overrideComponent(AttachmentsModalComponent, {
			set: { providers: [{ provide: AttachmentsModalStore, useValue: {} }, { provide: AttachmentsModalFacade, useValue: facade }] },
		});
		fixture = TestBed.createComponent(AttachmentsModalComponent);
		fixture.componentInstance.visible = true;
		fixture.detectChanges();
	});

	afterEach(() => vi.restoreAllMocks());

	const rows = () => Array.from(document.querySelectorAll('app-file-row'));

	it('renderiza cada adjunto como app-file-row con nombre y tamaño formateado', () => {
		expect(rows()).toHaveLength(2);
		expect(rows()[0].textContent).toContain('guia.pdf');
		expect(rows()[0].textContent).toContain('2 KB');
		expect(rows()[1].textContent).toContain('5 MB');
	});

	it('abrir una fila delega en el facade (visor + marcar leído)', () => {
		(rows()[0].querySelector('.file-row__info') as HTMLButtonElement).click();
		expect(facade.downloadAttachment).toHaveBeenCalledWith(attachments[0]);
	});

	it('el botón eliminar delega en el facade', () => {
		(rows()[1].querySelector('edu-button button, edu-button') as HTMLElement).click();
		expect(facade.deleteAttachment).toHaveBeenCalledWith(attachments[1]);
	});

	it('marca como nuevo solo el adjunto sin leer', () => {
		expect(rows()[0].querySelector('.unread-badge')).not.toBeNull();
		expect(rows()[1].querySelector('.unread-badge')).toBeNull();
	});
});
