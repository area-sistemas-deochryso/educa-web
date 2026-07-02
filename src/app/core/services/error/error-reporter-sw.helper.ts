import { sanitizeUrl } from './error-reporter.helpers';
import type { ErrorReportPayload } from './error-reporter.models';

const SW_FAILURE_DEDUP_MS = 10_000;
let lastSwFailureReport = 0;

export function createSwRevalidationListener(
	isBrowser: boolean,
	buildPayload: (opts: SwRevalidationPayloadOpts) => ErrorReportPayload,
	savePending: (payload: ErrorReportPayload) => void,
): (() => void) | null {
	if (!isBrowser || !('serviceWorker' in navigator)) return null;

	const handler = (event: MessageEvent): void => {
		if (event.data?.type !== 'REVALIDATION_FAILED') return;

		const now = Date.now();
		if (now - lastSwFailureReport < SW_FAILURE_DEDUP_MS) return;
		lastSwFailureReport = now;

		const url = event.data.payload?.originalUrl ?? event.data.payload?.url ?? '';

		const payload = buildPayload({
			url: sanitizeUrl(url, isBrowser),
		});

		savePending(payload);
	};

	navigator.serviceWorker.addEventListener('message', handler);
	return () => navigator.serviceWorker.removeEventListener('message', handler);
}

export interface SwRevalidationPayloadOpts {
	url: string;
}
