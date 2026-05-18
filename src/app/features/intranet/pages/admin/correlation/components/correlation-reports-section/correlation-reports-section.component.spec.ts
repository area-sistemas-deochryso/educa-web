import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CorrelationReportsSectionComponent } from './correlation-reports-section.component';
import { CorrelationReporteUsuarioDto } from '../../models';

function makeRow(over: Partial<CorrelationReporteUsuarioDto> = {}): CorrelationReporteUsuarioDto {
	return {
		id: 42,
		tipo: 'BUG',
		descripcionResumen: 'descripcion',
		propuestaResumen: null,
		url: '/foo',
		estado: 'PENDIENTE',
		plataforma: 'web',
		usuarioDniMasked: null,
		usuarioRol: null,
		usuarioNombre: null,
		fechaReg: '2026-05-18T10:00:00',
		...over,
	};
}

describe('CorrelationReportsSectionComponent', () => {
	let fixture: ComponentFixture<CorrelationReportsSectionComponent>;
	let component: CorrelationReportsSectionComponent;
	let router: Router;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [CorrelationReportsSectionComponent],
			providers: [provideRouter([])],
		}).compileComponents();

		fixture = TestBed.createComponent(CorrelationReportsSectionComponent);
		component = fixture.componentInstance;
		router = TestBed.inject(Router);

		fixture.componentRef.setInput('items', [makeRow()]);
		fixture.componentRef.setInput('correlationId', 'abc-1');
		fixture.detectChanges();
	});

	it('onGoToReport navigates with id queryParam', () => {
		const spy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
		component.onGoToReport(makeRow({ id: 99 }));
		expect(spy).toHaveBeenCalledWith(['/intranet/admin/reportes-usuario'], {
			queryParams: { id: 99 },
		});
	});

	it('renders the Acciones button', () => {
		const html = fixture.nativeElement as HTMLElement;
		const buttons = html.querySelectorAll('button[aria-label="Ver reporte"]');
		expect(buttons.length).toBe(1);
	});
});
