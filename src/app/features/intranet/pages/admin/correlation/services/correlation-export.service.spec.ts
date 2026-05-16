import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CorrelationSnapshot } from '../models';
import { CorrelationExportService } from './correlation-export.service';

const buildSnapshot = (id = 'abc-1'): CorrelationSnapshot => ({
	correlationId: id,
	generatedAt: '2026-04-25T10:00:00',
	errorLogs: [],
	rateLimitEvents: [],
	reportesUsuario: [],
	emailOutbox: [],
});

describe('CorrelationExportService', () => {
	let service: CorrelationExportService;

	beforeEach(() => {
		TestBed.configureTestingModule({});
		service = TestBed.inject(CorrelationExportService);
	});

	describe('buildFilename', () => {
		it('usa formato correlation-{id}-{YYYYMMDD}.json', () => {
			const now = new Date(2026, 4, 16); // mayo (idx 4)
			expect(service.buildFilename('abc-123', now)).toBe('correlation-abc-123-20260516.json');
		});

		it('padea mes y día con cero', () => {
			const now = new Date(2026, 0, 3); // 3 enero
			expect(service.buildFilename('x', now)).toBe('correlation-x-20260103.json');
		});
	});

	describe('buildPayload', () => {
		it('arma payload con correlationId, generatedAt ISO, hubUrl y snapshot', () => {
			const now = new Date('2026-05-16T15:30:00.000Z');
			const snapshot = buildSnapshot('abc-1');

			const payload = service.buildPayload(snapshot, 'abc-1', now);

			expect(payload.correlationId).toBe('abc-1');
			expect(payload.generatedAt).toBe('2026-05-16T15:30:00.000Z');
			expect(payload.snapshot).toBe(snapshot);
			expect(payload.hubUrl).toContain('/intranet/admin/correlation/abc-1');
		});
	});

	describe('exportSnapshot', () => {
		it('crea anchor, click y revoca object URL', () => {
			const snapshot = buildSnapshot('xyz-9');
			const createObjectURL = vi.fn().mockReturnValue('blob:fake');
			const revokeObjectURL = vi.fn();
			Object.defineProperty(globalThis.URL, 'createObjectURL', {
				value: createObjectURL,
				configurable: true,
			});
			Object.defineProperty(globalThis.URL, 'revokeObjectURL', {
				value: revokeObjectURL,
				configurable: true,
			});

			const anchor = document.createElement('a');
			const clickSpy = vi.spyOn(anchor, 'click').mockImplementation(() => undefined);
			const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(anchor);

			service.exportSnapshot(snapshot, 'xyz-9', new Date(2026, 4, 16));

			expect(createElementSpy).toHaveBeenCalledWith('a');
			expect(anchor.download).toBe('correlation-xyz-9-20260516.json');
			expect(anchor.href).toContain('blob:fake');
			expect(clickSpy).toHaveBeenCalledOnce();
			expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake');

			createElementSpy.mockRestore();
			clickSpy.mockRestore();
		});
	});
});
