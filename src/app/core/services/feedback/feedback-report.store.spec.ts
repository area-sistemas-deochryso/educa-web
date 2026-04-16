// Tests for FeedbackReportStore — invariante INV-RU04 (lifecycle del estado de feedback:
// resetForm en apertura, closeDialog limpia correlación, submitting guard previene doble-submit).
import { describe, expect, it, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';

import { FeedbackReportStore } from './feedback-report.store';

describe('FeedbackReportStore — INV-RU04 lifecycle', () => {
	let store: FeedbackReportStore;

	beforeEach(() => {
		TestBed.configureTestingModule({});
		store = TestBed.inject(FeedbackReportStore);
	});

	// #region Dialog lifecycle
	describe('open/close dialog', () => {
		it('inicia con dialog cerrado', () => {
			expect(store.dialogVisible()).toBe(false);
		});

		it('openDialog hace visible el dialog', () => {
			store.openDialog();
			expect(store.dialogVisible()).toBe(true);
		});

		it('closeDialog limpia el estado completo (INV-RU04: regeneración en cierre)', () => {
			store.openDialog();
			store.setRecentErrorId('err-123');
			store.setError('algo falló');
			store.closeDialog();

			expect(store.dialogVisible()).toBe(false);
			expect(store.recentErrorId()).toBeNull();
			expect(store.linkToRecentError()).toBe(true);
			expect(store.error()).toBeNull();
			expect(store.lastSubmittedOk()).toBe(false);
		});
	});
	// #endregion

	// #region Formulario reset
	describe('resetForm — limpia entre aperturas sucesivas', () => {
		it('resetForm limpia tipo, descripcion y propuesta', () => {
			store.updateForm({ tipo: 'PAGINA_LENTA', descripcion: 'todo lento', propuesta: 'mejorar' });
			store.resetForm();

			const form = store.formData();
			expect(form.tipo).toBeNull();
			expect(form.descripcion).toBe('');
			expect(form.propuesta).toBe('');
		});

		it('resetForm limpia error y lastSubmittedOk', () => {
			store.setError('fallo previo');
			store.markSubmittedOk();
			store.resetForm();

			expect(store.error()).toBeNull();
			expect(store.lastSubmittedOk()).toBe(false);
		});
	});
	// #endregion

	// #region Validaciones
	describe('validaciones del formulario', () => {
		it('tipo es requerido', () => {
			expect(store.tipoError()).not.toBeNull();
			store.updateForm({ tipo: 'PAGINA_LENTA' });
			expect(store.tipoError()).toBeNull();
		});

		it('descripcion mínimo 20 caracteres', () => {
			store.updateForm({ descripcion: 'corto' });
			expect(store.descripcionError()).toContain('20');
		});

		it('descripcion máximo 2000 caracteres', () => {
			store.updateForm({ descripcion: 'x'.repeat(2001) });
			expect(store.descripcionError()).toContain('2000');
		});

		it('isValid true solo cuando tipo + descripcion son válidos', () => {
			expect(store.isValid()).toBe(false);
			store.updateForm({ tipo: 'ERROR_SERVIDOR', descripcion: 'Este es un reporte con suficiente detalle' });
			expect(store.isValid()).toBe(true);
		});
	});
	// #endregion

	// #region Submitting guard
	describe('submitting guard (previene doble-submit)', () => {
		it('submitting inicia en false', () => {
			expect(store.submitting()).toBe(false);
		});

		it('setSubmitting(true) bloquea', () => {
			store.setSubmitting(true);
			expect(store.submitting()).toBe(true);
		});

		it('markSubmittedOk desbloquea submitting', () => {
			store.setSubmitting(true);
			store.markSubmittedOk();
			expect(store.submitting()).toBe(false);
			expect(store.lastSubmittedOk()).toBe(true);
		});
	});
	// #endregion

	// #region Correlación con error visible
	describe('recentErrorId — enlace con error visible', () => {
		it('setRecentErrorId almacena el ID y activa linkToRecentError', () => {
			store.setRecentErrorId('err-abc');
			expect(store.recentErrorId()).toBe('err-abc');
			expect(store.linkToRecentError()).toBe(true);
		});

		it('setRecentErrorId(null) desactiva link', () => {
			store.setRecentErrorId('err-abc');
			store.setRecentErrorId(null);
			expect(store.recentErrorId()).toBeNull();
			expect(store.linkToRecentError()).toBe(false);
		});

		it('usuario puede desmarcar link manualmente', () => {
			store.setRecentErrorId('err-abc');
			store.setLinkToRecentError(false);
			expect(store.linkToRecentError()).toBe(false);
		});
	});
	// #endregion
});
