// * Tests for Plan 27 · INV-C11 — per-student notice component.
// #region Imports
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { provideZonelessChangeDetection } from '@angular/core';

import { AttendanceScopeStudentNoticeComponent } from './attendance-scope-student-notice.component';
// #endregion

describe('AttendanceScopeStudentNoticeComponent', () => {
	let fixture: ComponentFixture<AttendanceScopeStudentNoticeComponent>;

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [AttendanceScopeStudentNoticeComponent],
			providers: [provideZonelessChangeDetection()],
		});

		fixture = TestBed.createComponent(AttendanceScopeStudentNoticeComponent);
	});

	it('se crea correctamente', () => {
		fixture.detectChanges();
		expect(fixture.componentInstance).toBeTruthy();
	});

	it('usa mensaje genérico "Este alumno" cuando no se provee nombre', () => {
		fixture.detectChanges();
		const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
		expect(text).toContain('Este alumno aún no usa asistencia biométrica');
	});

	it('personaliza el mensaje con el nombre del hijo cuando viene por input', () => {
		fixture.componentRef.setInput('nombre', 'Juan Pérez');
		fixture.detectChanges();

		const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
		expect(text).toContain('Juan Pérez aún no usa asistencia biométrica');
	});

	it('explica el criterio (5to Primaria en adelante)', () => {
		fixture.detectChanges();
		const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
		expect(text).toContain('5to Primaria');
	});

	it('a11y: tiene role="note"', () => {
		fixture.detectChanges();
		const notice = (fixture.nativeElement as HTMLElement).querySelector('.scope-notice');
		expect(notice?.getAttribute('role')).toBe('note');
	});
});
