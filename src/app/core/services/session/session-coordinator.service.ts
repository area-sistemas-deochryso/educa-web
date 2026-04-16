// #region Imports
import { Injectable, inject } from '@angular/core';

import { Subject } from 'rxjs';

import { AuthService } from '@core/services/auth/auth.service';
import { logger } from '@core/helpers';
// #endregion

// #region Types

/** BroadcastChannel name for multi-tab coordination. */
const CHANNEL_NAME = 'educa-session';

export type SessionMessage =
	| { type: 'refresh-done'; timestamp: number }
	| { type: 'logout' }
	| { type: 'login'; entityId: number; rol: string };

// #endregion

// #region Implementation

/**
 * Manages cross-tab communication via BroadcastChannel.
 *
 * - Broadcasts refresh/logout/login events to sibling tabs.
 * - Emits incoming messages via `message$` so other services can react.
 * - Detects when another tab logs in with a different user.
 */
@Injectable({ providedIn: 'root' })
export class SessionCoordinatorService {
	// #region Dependencies
	private authService = inject(AuthService);
	// #endregion

	// #region State
	private channel: BroadcastChannel | null = null;
	private readonly _message$ = new Subject<SessionMessage>();

	/** Stream of messages received from other tabs. */
	readonly message$ = this._message$.asObservable();
	// #endregion

	// #region Public API

	/**
	 * Open the BroadcastChannel and start listening for messages from other tabs.
	 */
	setup(): void {
		try {
			this.channel = new BroadcastChannel(CHANNEL_NAME);
			this.channel.onmessage = (event: MessageEvent<SessionMessage>) => {
				this.handleMessage(event.data);
			};
		} catch {
			// BroadcastChannel not supported (e.g. older Safari) — degrade gracefully
			logger.warn('[SessionCoordinator] BroadcastChannel not available — multi-tab coordination disabled');
		}
	}

	/**
	 * Close the channel and stop listening.
	 */
	teardown(): void {
		this.channel?.close();
		this.channel = null;
	}

	/**
	 * Broadcast a message to all other tabs.
	 */
	broadcast(msg: SessionMessage): void {
		try {
			this.channel?.postMessage(msg);
		} catch {
			// Channel closed or errored — ignore
		}
	}

	// #endregion

	// #region Message handling

	private handleMessage(msg: SessionMessage): void {
		if (msg.type === 'login') {
			// Another tab logged in — check if the user changed
			const currentUser = this.authService.currentUser;
			if (currentUser && (currentUser.entityId !== msg.entityId || currentUser.rol !== msg.rol)) {
				logger.warn('[SessionCoordinator] Otro tab inició sesión con un usuario diferente');
			}
		}

		// Forward all messages to subscribers
		this._message$.next(msg);
	}

	// #endregion
}
// #endregion
