// #region Imports
import { beforeEach, describe, expect, it } from 'vitest';

import { LoggingConfigSnapshot, LoggingConfigStore } from './logging.store';

// #endregion
// #region Implementation
describe('LoggingConfigStore', () => {
	let store: LoggingConfigStore;

	beforeEach(() => {
		store = new LoggingConfigStore();
	});

	it('should set snapshot and expose vm', () => {
		const snapshot: LoggingConfigSnapshot = {
			isDev: true,
			log: {
				enabled: true,
				minLevel: 'warn',
				filter: 'Auth*',
			},
			debug: {
				enabled: false,
				minLevel: 'TRACE',
				filter: 'STORE:*',
			},
		};

		store.setSnapshot(snapshot);

		expect(store.vm()).toEqual(snapshot);
	});

	it('should update individual setters', () => {
		store.setIsDev(true);
		store.setLogEnabled(true);
		store.setLogMinLevel('info');
		store.setLogFilter('UI:*');
		store.setDebugEnabled(true);
		store.setDebugMinLevel('WARN');
		store.setDebugFilter('API:*');

		const vm = store.vm();

		expect(vm.isDev).toBe(true);
		expect(vm.log.enabled).toBe(true);
		expect(vm.log.minLevel).toBe('info');
		expect(vm.log.filter).toBe('UI:*');
		expect(vm.debug.enabled).toBe(true);
		expect(vm.debug.minLevel).toBe('WARN');
		expect(vm.debug.filter).toBe('API:*');
	});
});
// #endregion
