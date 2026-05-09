import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WalService } from './wal.service';
import { WalDbService } from './wal-db.service';
import { WalEntry } from './models';

describe('WalService', () => {
	describe('normalizeEndpoint (static)', () => {
		it('lowercases the path when no query string is present', () => {
			expect(WalService.normalizeEndpoint('/api/Usuarios/123')).toBe('/api/usuarios/123');
		});

		it('lowercases the path and preserves the query string casing', () => {
			expect(
				WalService.normalizeEndpoint('/api/Sistema/Usuarios?correlationId=ABC123'),
			).toBe('/api/sistema/usuarios?correlationId=ABC123');
		});

		it('preserves a path that is already lowercase', () => {
			expect(WalService.normalizeEndpoint('/api/horario/45')).toBe('/api/horario/45');
		});

		it('handles absolute URLs by lowercasing the entire prefix up to the query', () => {
			expect(
				WalService.normalizeEndpoint('https://api.educacom.pe/api/Cursos/7?Search=Foo'),
			).toBe('https://api.educacom.pe/api/cursos/7?Search=Foo');
		});

		it('handles empty query gracefully', () => {
			expect(WalService.normalizeEndpoint('/api/Foo?')).toBe('/api/foo?');
		});
	});

	describe('append', () => {
		let service: WalService;
		let putSpy: ReturnType<typeof vi.fn>;

		beforeEach(() => {
			putSpy = vi.fn().mockResolvedValue(undefined);

			TestBed.configureTestingModule({
				providers: [
					WalService,
					{
						provide: WalDbService,
						useValue: { put: putSpy, get: vi.fn(), delete: vi.fn() },
					},
				],
			});

			service = TestBed.inject(WalService);
		});

		it('persists the endpoint with lowercase path', async () => {
			const entry = await service.append({
				operation: 'UPDATE',
				resourceType: 'usuarios',
				endpoint: '/api/Sistema/Usuarios/42',
				method: 'PUT',
				payload: { id: 42 },
			});

			expect(entry.endpoint).toBe('/api/sistema/usuarios/42');
			expect(putSpy).toHaveBeenCalledTimes(1);
			const persisted = putSpy.mock.calls[0][0] as WalEntry;
			expect(persisted.endpoint).toBe('/api/sistema/usuarios/42');
		});

		it('preserves query string casing while lowercasing the path', async () => {
			const entry = await service.append({
				operation: 'CREATE',
				resourceType: 'errors',
				endpoint: '/api/Sistema/Errors?correlationId=ABC123',
				method: 'POST',
				payload: { msg: 'x' },
			});

			expect(entry.endpoint).toBe('/api/sistema/errors?correlationId=ABC123');
		});
	});
});
