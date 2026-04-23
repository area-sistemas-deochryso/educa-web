import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { AuditoriaCorreosStatsComponent } from './auditoria-correos-stats.component';

describe('AuditoriaCorreosStatsComponent', () => {
	let fixture: ComponentFixture<AuditoriaCorreosStatsComponent>;

	beforeEach(() => {
		TestBed.configureTestingModule({ imports: [AuditoriaCorreosStatsComponent] });
		fixture = TestBed.createComponent(AuditoriaCorreosStatsComponent);
	});

	it('renderiza 4 stat cards con los conteos correctos', () => {
		fixture.componentRef.setInput('stats', {
			total: 22,
			estudiantes: 10,
			apoderados: 0,
			profesores: 12,
		});
		fixture.detectChanges();

		const html = (fixture.nativeElement as HTMLElement).textContent ?? '';
		expect(html).toContain('22');
		expect(html).toContain('10');
		expect(html).toContain('Estudiantes');
		expect(html).toContain('Apoderados');
		expect(html).toContain('Profesores');
		expect(html).toContain('12');
	});

	it('con ceros renderiza sin caerse', () => {
		fixture.componentRef.setInput('stats', {
			total: 0,
			estudiantes: 0,
			apoderados: 0,
			profesores: 0,
		});
		fixture.detectChanges();

		const cards = (fixture.nativeElement as HTMLElement).querySelectorAll('.stat-card');
		expect(cards.length).toBe(4);
	});
});
