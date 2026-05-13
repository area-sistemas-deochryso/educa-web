import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WalService } from './wal.service';
import { WalDbService } from './wal-db.service';
import { WalEntry } from './models';

describe('WalService', () => {
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

		it('persists the endpoint preserving the original casing', async () => {
			const entry = await service.append({
				operation: 'UPDATE',
				resourceType: 'usuarios',
				endpoint: '/api/Sistema/Usuarios/42',
				method: 'PUT',
				payload: { id: 42 },
			});

			expect(entry.endpoint).toBe('/api/Sistema/Usuarios/42');
			expect(putSpy).toHaveBeenCalledTimes(1);
			const persisted = putSpy.mock.calls[0][0] as WalEntry;
			expect(persisted.endpoint).toBe('/api/Sistema/Usuarios/42');
		});

		it('preserves casing in path segments that are case-sensitive in the backend (e.g. role parameters)', async () => {
			// Regression: the WAL used to lowercase the entire path before persisting,
			// which broke /api/sistema/usuarios/{rol}/{id} because the BE compares
			// rol === "Estudiante" case-sensitive in IUsuarioRolStrategy.SoportaRol.
			const entry = await service.append({
				operation: 'UPDATE',
				resourceType: 'usuarios',
				endpoint: '/api/sistema/usuarios/Estudiante/240',
				method: 'PUT',
				payload: { dni: '79474395' },
			});

			expect(entry.endpoint).toBe('/api/sistema/usuarios/Estudiante/240');
		});

		it('preserves query string casing as well', async () => {
			const entry = await service.append({
				operation: 'CREATE',
				resourceType: 'errors',
				endpoint: '/api/sistema/errors?correlationId=ABC123',
				method: 'POST',
				payload: { msg: 'x' },
			});

			expect(entry.endpoint).toBe('/api/sistema/errors?correlationId=ABC123');
		});
	});
});
