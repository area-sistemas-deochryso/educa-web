// #region Imports
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { isDevMode } from '@angular/core';
import { environment } from '@config';
import { DebugService } from '../debug/debug.service';
import { logger } from '../logs/logger';
import { LoggingFacade } from './logging.facade';
import { LoggingConfigStore } from './logging.store';

// #endregion
// #region Implementation
describe('LoggingFacade', () => {
	let facade: LoggingFacade;
	let debug: DebugService;

	beforeEach(() => {
		try {
			localStorage.clear();
		} catch {
			// noop
		}

		TestBed.configureTestingModule({
			providers: [LoggingFacade, LoggingConfigStore, DebugService],
		});

		facade = TestBed.inject(LoggingFacade);
		debug = TestBed.inject(DebugService);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should refresh store on init', () => {
		const vm = facade.vm();
		const expectedIsDev = isDevMode() && !environment.production;

		expect(vm.isDev).toBe(expectedIsDev);
		expect(vm.log.minLevel).toBe('debug');
		expect(vm.log.filter).toBe('');
		expect(vm.debug.minLevel).toBe('INFO');
		expect(vm.debug.filter).toBe('');
	});

	it('should set log filter and update store', () => {
		const setFilterSpy = vi.spyOn(logger, 'setFilter');

		facade.setLogFilter('Auth*', false);

		expect(setFilterSpy).toHaveBeenCalledWith('Auth*', false);
		expect(facade.vm().log.filter).toBe('Auth*');
	});

	it('should set debug min level and update store', () => {
		const setMinLevelSpy = vi.spyOn(debug, 'setMinLevel');

		facade.setDebugMinLevel('TRACE', false);

		expect(setMinLevelSpy).toHaveBeenCalledWith('TRACE', false);
		expect(facade.vm().debug.minLevel).toBe('TRACE');
	});

	it('should clear overrides and refresh store', () => {
		facade.setLogFilter('Auth*', false);
		facade.setDebugFilter('STORE:*', false);

		const logClearSpy = vi.spyOn(logger, 'clearOverrides');
		const debugClearSpy = vi.spyOn(debug, 'clearOverrides');

		facade.clearOverrides();

		expect(logClearSpy).toHaveBeenCalled();
		expect(debugClearSpy).toHaveBeenCalled();
		expect(facade.vm().log.filter).toBe('');
		expect(facade.vm().debug.filter).toBe('');
	});
});
// #endregion
