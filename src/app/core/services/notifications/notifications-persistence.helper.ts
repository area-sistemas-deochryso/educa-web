import { logger } from '@core/helpers';
import { StorageService } from '@core/services/storage';

type DailySetKind = 'dismissed' | 'read';

function isToday(dateIso: string): boolean {
	return new Date(dateIso).toDateString() === new Date().toDateString();
}

function readDaily(storage: StorageService, kind: DailySetKind) {
	return kind === 'dismissed'
		? storage.getDismissedNotificationsAsync()
		: storage.getReadNotificationsAsync();
}

function clearDaily(storage: StorageService, kind: DailySetKind): void {
	if (kind === 'dismissed') storage.removeDismissedNotifications();
	else storage.removeReadNotifications();
}

function writeDaily(
	storage: StorageService,
	kind: DailySetKind,
	payload: { ids: string[]; date: string },
): Promise<void> {
	return kind === 'dismissed'
		? storage.setDismissedNotificationsAsync(payload)
		: storage.setReadNotificationsAsync(payload);
}

/**
 * Load a persisted Set of ids that resets on date change.
 */
export async function loadDailyIdSet(
	storage: StorageService,
	kind: DailySetKind,
): Promise<Set<string>> {
	try {
		const data = await readDaily(storage, kind);
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
): Promise<void> {
	return writeDaily(storage, kind, { ids: [...ids], date: new Date().toISOString() }).catch(
		(e) => {
			logger.error(`[Notifications] Error saving ${kind}:`, e);
		},
	);
}
