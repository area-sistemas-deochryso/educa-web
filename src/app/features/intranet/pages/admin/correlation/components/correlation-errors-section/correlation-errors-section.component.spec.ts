import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CorrelationErrorsSectionComponent } from './correlation-errors-section.component';
import { CorrelationErrorLogDto } from '../../models';

function makeRow(over: Partial<CorrelationErrorLogDto> = {}): CorrelationErrorLogDto {
	return {
		id: 1,
		severidad: 'CRITICAL',
		mensaje: 'Error de prueba',
		url: '/api/foo',
		httpMethod: 'GET',
		httpStatus: 500,
		errorCode: null,
		usuarioDniMasked: null,
		usuarioRol: null,
		plataforma: 'web',
		fecha: '2026-05-18T10:00:00',
		errorGroupCode: 'abc123def456',
		...over,
	};
}

describe('CorrelationErrorsSectionComponent', () => {
	let fixture: ComponentFixture<CorrelationErrorsSectionComponent>;
	let component: CorrelationErrorsSectionComponent;
	let router: Router;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [CorrelationErrorsSectionComponent],
			providers: [provideRouter([])],
		}).compileComponents();

		fixture = TestBed.createComponent(CorrelationErrorsSectionComponent);
		component = fixture.componentInstance;
		router = TestBed.inject(Router);

		fixture.componentRef.setInput('items', [makeRow()]);
		fixture.componentRef.setInput('correlationId', 'abc-1');
		fixture.detectChanges();
	});

	it('canGoToGroup returns true when errorGroupCode present', () => {
		expect(component.canGoToGroup(makeRow({ errorGroupCode: 'xyz' }))).toBe(true);
	});

	it('canGoToGroup returns false when errorGroupCode nullish', () => {
		expect(component.canGoToGroup(makeRow({ errorGroupCode: null }))).toBe(false);
		expect(component.canGoToGroup(makeRow({ errorGroupCode: undefined }))).toBe(false);
	});

	it('onGoToGroup navigates with fingerprint queryParam', () => {
		const spy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
		component.onGoToGroup(makeRow({ errorGroupCode: 'abc123def456' }));
		expect(spy).toHaveBeenCalledWith(['/intranet/admin/trazabilidad-errores'], {
			queryParams: { fingerprint: 'abc123def456' },
		});
	});

	it('onGoToGroup is no-op when errorGroupCode nullish', () => {
		const spy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
		component.onGoToGroup(makeRow({ errorGroupCode: null }));
		expect(spy).not.toHaveBeenCalled();
	});
});
