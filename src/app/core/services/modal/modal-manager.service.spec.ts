// * Tests for ModalManagerService — validates centralized modal state management.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ModalManagerService } from './modal-manager.service';

// #endregion

// #region Tests
describe('ModalManagerService', () => {
	let service: ModalManagerService;

	beforeEach(() => {
		TestBed.configureTestingModule({ providers: [ModalManagerService] });
		service = TestBed.inject(ModalManagerService);
	});

	// #region Initial state
	describe('initial state', () => {
		it('should have no open modals', () => {
			expect(service.openModals()).toEqual([]);
			expect(service.hasOpenModals()).toBe(false);
			expect(service.activeModal()).toBeNull();
			expect(service.modalCount()).toBe(0);
		});
	});
	// #endregion

	// #region Open / Close
	describe('open and close', () => {
		it('should open a modal', () => {
			service.open({ id: 'test-modal', title: 'Test' });

			expect(service.isOpen('test-modal')()).toBe(true);
			expect(service.hasOpenModals()).toBe(true);
			expect(service.activeModal()).toBe('test-modal');
			expect(service.modalCount()).toBe(1);
		});

		it('should close a modal', () => {
			service.open({ id: 'test-modal' });
			service.close('test-modal');

			expect(service.isOpen('test-modal')()).toBe(false);
			expect(service.hasOpenModals()).toBe(false);
		});

		it('should call onClose callback', () => {
			const onClose = vi.fn();
			service.open({ id: 'test', onClose });
			service.close('test', { confirmed: true, data: 'result' });

			expect(onClose).toHaveBeenCalledWith({ confirmed: true, data: 'result' });
		});

		it('should handle closing non-existent modal', () => {
			service.close('nonexistent');
			expect(service.hasOpenModals()).toBe(false);
		});
	});
	// #endregion

	// #region Multiple modals (stacking)
	describe('multiple modals', () => {
		it('should track multiple open modals', () => {
			service.open({ id: 'modal-1' });
			service.open({ id: 'modal-2' });

			expect(service.modalCount()).toBe(2);
			expect(service.activeModal()).toBe('modal-2');
		});

		it('should close only one modal', () => {
			service.open({ id: 'modal-1' });
			service.open({ id: 'modal-2' });
			service.close('modal-2');

			expect(service.modalCount()).toBe(1);
			expect(service.activeModal()).toBe('modal-1');
		});
	});
	// #endregion

	// #region closeActive
	describe('closeActive', () => {
		it('should close the most recent modal', () => {
			service.open({ id: 'modal-1' });
			service.open({ id: 'modal-2' });

			service.closeActive();

			expect(service.isOpen('modal-2')()).toBe(false);
			expect(service.isOpen('modal-1')()).toBe(true);
		});

		it('should do nothing when no modals open', () => {
			service.closeActive();
			expect(service.hasOpenModals()).toBe(false);
		});
	});
	// #endregion

	// #region closeAll
	describe('closeAll', () => {
		it('should close all modals', () => {
			service.open({ id: 'modal-1' });
			service.open({ id: 'modal-2' });
			service.open({ id: 'modal-3' });

			service.closeAll();

			expect(service.hasOpenModals()).toBe(false);
			expect(service.modalCount()).toBe(0);
		});

		it('should call onClose for visible modals with confirmed=false', () => {
			const onClose = vi.fn();
			service.open({ id: 'test', onClose });

			service.closeAll();

			expect(onClose).toHaveBeenCalledWith({ confirmed: false });
		});
	});
	// #endregion

	// #region Toggle
	describe('toggle', () => {
		it('should open when closed', () => {
			service.toggle({ id: 'test' });
			expect(service.isOpen('test')()).toBe(true);
		});

		it('should close when open', () => {
			service.open({ id: 'test' });
			service.toggle({ id: 'test' });
			expect(service.isOpen('test')()).toBe(false);
		});
	});
	// #endregion

	// #region getData / updateData
	describe('data management', () => {
		it('should store and retrieve data', () => {
			service.open({ id: 'test', data: { courseId: 123 } });
			expect(service.getData('test')).toEqual({ courseId: 123 });
		});

		it('should update data', () => {
			service.open({ id: 'test', data: { name: 'old', count: 1 } });
			service.updateData('test', { name: 'new' });

			expect(service.getData('test')).toEqual({ name: 'new', count: 1 });
		});

		it('should return undefined for non-existent modal', () => {
			expect(service.getData('nonexistent')).toBeUndefined();
		});
	});
	// #endregion

	// #region getState
	describe('getState', () => {
		it('should return modal state', () => {
			service.open({ id: 'test', title: 'My Modal', size: 'lg' });
			const state = service.getState('test')();

			expect(state?.visible).toBe(true);
			expect(state?.title).toBe('My Modal');
			expect(state?.size).toBe('lg');
		});

		it('should apply defaults', () => {
			service.open({ id: 'test' });
			const state = service.getState('test')();

			expect(state?.dismissible).toBe(true);
			expect(state?.closable).toBe(true);
			expect(state?.size).toBe('md');
		});
	});
	// #endregion

	// #region Register / Unregister
	describe('register / unregister', () => {
		it('should register without opening', () => {
			service.register({ id: 'test' });
			expect(service.isOpen('test')()).toBe(false);
			expect(service.getState('test')()).toBeDefined();
		});

		it('should not re-register existing modal', () => {
			service.register({ id: 'test', title: 'First' });
			service.register({ id: 'test', title: 'Second' });

			expect(service.getState('test')()?.title).toBe('First');
		});

		it('should unregister modal', () => {
			service.open({ id: 'test' });
			service.unregister('test');

			expect(service.getState('test')()).toBeUndefined();
		});
	});
	// #endregion

	// #region Navigation
	describe('goBack', () => {
		it('should close current and return to previous', () => {
			service.open({ id: 'modal-1' });
			service.open({ id: 'modal-2' });

			service.goBack();

			expect(service.isOpen('modal-2')()).toBe(false);
			expect(service.activeModal()).toBe('modal-1');
		});

		it('should do nothing with only one modal', () => {
			service.open({ id: 'modal-1' });
			service.goBack();
			expect(service.isOpen('modal-1')()).toBe(true);
		});
	});
	// #endregion

	// #region Confirm / Cancel
	describe('confirm and cancel', () => {
		it('should confirm with data', () => {
			const onClose = vi.fn();
			service.open({ id: 'test', onClose });

			service.confirm({ answer: 42 });

			expect(onClose).toHaveBeenCalledWith({ confirmed: true, data: { answer: 42 } });
		});

		it('should cancel', () => {
			const onClose = vi.fn();
			service.open({ id: 'test', onClose });

			service.cancel();

			expect(onClose).toHaveBeenCalledWith({ confirmed: false });
		});
	});
	// #endregion
});
// #endregion
