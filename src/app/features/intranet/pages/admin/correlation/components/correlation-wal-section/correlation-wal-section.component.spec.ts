// #region Imports
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WalCorrelationReader, type WalEntry } from '@core/services/wal';
import { CorrelationWalSectionComponent, WAL_SECTION_NOTICE } from './correlation-wal-section.component';
// #endregion

function makeEntry(id: string, overrides: Partial<WalEntry> = {}): WalEntry {
	return {
		id,
		timestamp: Date.parse('2026-10-24T10:00:00'),
		operation: 'UPDATE',
		resourceType: 'horarios',
		endpoint: '/api/horario/1',
		method: 'PUT',
		payload: { secreto: 'no-debe-verse' },
		status: 'PENDING',
		retries: 0,
		maxRetries: 2,
		correlationId: 'sess-1',
		...overrides,
	};
}

// #region Tests
describe('CorrelationWalSectionComponent', () => {
	let fixture: ComponentFixture<CorrelationWalSectionComponent>;
	let getByCorrelationId: ReturnType<typeof vi.fn>;

	beforeEach(async () => {
		getByCorrelationId = vi.fn().mockResolvedValue([]);
		await TestBed.configureTestingModule({
			imports: [CorrelationWalSectionComponent],
			providers: [{ provide: WalCorrelationReader, useValue: { getByCorrelationId } }],
		}).compileComponents();
		fixture = TestBed.createComponent(CorrelationWalSectionComponent);
	});

	async function render(): Promise<string> {
		fixture.detectChanges();
		await fixture.whenStable();
		fixture.detectChanges();
		return (fixture.nativeElement as HTMLElement).textContent ?? '';
	}

	it('always shows the fixed notice from ADR-0009', async () => {
		expect(await render()).toContain(WAL_SECTION_NOTICE);
		expect(WAL_SECTION_NOTICE).toBe(
			'Solo muestra el navegador donde estás conectado; no incluye la sesión del usuario afectado.',
		);
	});

	it('does not query the WAL without sessionId and says so', async () => {
		const text = await render();

		expect(getByCorrelationId).not.toHaveBeenCalled();
		expect(text).toContain('Sin sesión resuelta: no se consulta el WAL');
	});

	it('queries the WAL by the given sessionId', async () => {
		fixture.componentRef.setInput('sessionId', 'sess-1');
		await render();

		expect(getByCorrelationId).toHaveBeenCalledTimes(1);
		expect(getByCorrelationId).toHaveBeenCalledWith('sess-1');
	});

	it('shows an explicit empty state when the session has no entries in this browser', async () => {
		fixture.componentRef.setInput('sessionId', 'sess-1');

		expect(await render()).toContain('Sin operaciones del WAL en este navegador');
	});

	it('renders entries oldest first with operation, resource, endpoint, status and retries, never the payload', async () => {
		getByCorrelationId.mockResolvedValue([
			makeEntry('b', { timestamp: Date.parse('2026-10-24T10:05:00'), status: 'FAILED', retries: 2, error: 'detalle interno' }),
			makeEntry('a', { timestamp: Date.parse('2026-10-24T10:00:00') }),
		]);
		fixture.componentRef.setInput('sessionId', 'sess-1');

		const text = await render();
		const rows = (fixture.nativeElement as HTMLElement).querySelectorAll('li');

		expect(rows).toHaveLength(2);
		expect(rows[0].textContent).toContain('PENDING');
		expect(rows[1].textContent).toContain('FAILED');
		expect(rows[1].textContent).toContain('2 reintento(s)');
		expect(text).toContain('UPDATE PUT');
		expect(text).toContain('horarios');
		expect(text).toContain('/api/horario/1');
		expect(text).not.toContain('no-debe-verse');
		expect(text).not.toContain('detalle interno');
	});

	it('shows an error state instead of breaking when the WAL read fails', async () => {
		getByCorrelationId.mockRejectedValue(new Error('idb down'));
		fixture.componentRef.setInput('sessionId', 'sess-1');

		const text = await render();

		expect(text).toContain('No se pudo leer el WAL de este navegador');
		expect(text).toContain(WAL_SECTION_NOTICE);
	});

	it('is read-only: the reader exposes no write method to the component', () => {
		const reader = new Set(Object.getOwnPropertyNames(WalCorrelationReader.prototype));

		expect([...reader].sort()).toEqual(['constructor', 'getByCorrelationId']);
	});
});
// #endregion
