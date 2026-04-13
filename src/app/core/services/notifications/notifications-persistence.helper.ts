import { logger } from '@core/helpers';
import { StorageService } from '@core/services/storage';

type DailySetKind = 'dismissed' | 'read';

function isToday(dateIso: string): boolean {
	return new Date(dateIso).toDateString() === new Date().toDateString();
}

function readDaily(storage: StorageService, kind: DailySetKind) {
	return kind === 'dismissed'
		? storage.getDismissedNotifications()
		: storage.getReadNotifications();
}

function clearDaily(storage: StorageService, kind: DailySetKind): void {
	if (kind === 'dismissed') storage.removeDismissedNotifications();
	else storage.removeReadNotifications();
}

function writeDaily(
	storage: StorageService,
	kind: DailySetKind,
	payload: { ids: string[]; date: string },
): void {
	if (kind === 'dismissed') storage.setDismissedNotifications(payload);
	else storage.setReadNotifications(payload);
}

/**
 * Load a persisted Set of ids that resets on date change.
 */
export function loadDailyIdSet(storage: StorageService, kind: DailySetKind): Set<string> {
	try {
		const data = readDaily(storage, kind);
		if (data) {
			if (isToday(data.date)) return new Set(data.ids);
			clearDaily(storage, kind);
		}
	} catch (e) {
		logger.error(`[Notifications] Error loading ${kind}:`, e);
		clearDaily(storage, kind);
	}
	return new Set();
}

/**
 * Persist a Set of ids with today's date.
 */
export function saveDailyIdSet(
	storage: StorageService,
	kind: DailySetKind,
	ids: ReadonlySet<string>,
): void {
	try {
		writeDaily(storage, kind, { ids: [...ids], date: new Date().toISOString() });
	} catch (e) {
		logger.error(`[Notifications] Error saving ${kind}:`, e);
	}
}
