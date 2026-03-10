import { Injectable, inject, PLATFORM_ID, DestroyRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Subject } from 'rxjs';
import { logger } from '@core/helpers';

// #region Types

interface WalLeaderMessage {
	type: 'HEARTBEAT' | 'CLAIM' | 'RELEASE' | 'ENTRY_COMMITTED';
	tabId: string;
	timestamp: number;
	/** Entry ID for ENTRY_COMMITTED messages */
	entryId?: string;
	/** resourceType for cache invalidation */
	resourceType?: string;
}

// #endregion

const CHANNEL_NAME = 'educa-wal-leader';
/** Heartbeat interval in ms. */
const HEARTBEAT_MS = 3_000;
/** If no heartbeat from leader in this time, assume dead and claim leadership. */
const LEADER_TIMEOUT_MS = HEARTBEAT_MS * 3;

/**
 * Multi-tab leader election for WAL processing.
 *
 * Only the leader tab processes WAL entries (sync engine).
 * Follower tabs listen for ENTRY_COMMITTED messages to refresh their stores.
 * If the leader tab closes or becomes unresponsive, another tab claims leadership.
 */
@Injectable({ providedIn: 'root' })
export class WalLeaderService {
	// #region Dependencies

	private platformId = inject(PLATFORM_ID);
	private destroyRef = inject(DestroyRef);

	// #endregion

	// #region State

	private readonly tabId = crypto.randomUUID();
	private channel: BroadcastChannel | null = null;
	private _isLeader = false;
	private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
	private leaderCheckTimer: ReturnType<typeof setInterval> | null = null;
	private lastLeaderHeartbeat = 0;
	private currentLeaderId: string | null = null;

	/** Emits when a WAL entry was committed by another tab (leader). */
	private _entryCommittedByOtherTab$ = new Subject<{
		entryId: string;
		resourceType: string;
	}>();
	readonly entryCommittedByOtherTab$ =
		this._entryCommittedByOtherTab$.asObservable();

	// #endregion

	// #region Public API

	get isLeader(): boolean {
		return this._isLeader;
	}

	/**
	 * Start leader election. The first tab to claim becomes leader.
	 * Must be called after WAL services are initialized.
	 */
	start(): void {
		if (!isPlatformBrowser(this.platformId)) return;

		try {
			this.channel = new BroadcastChannel(CHANNEL_NAME);
			this.channel.onmessage = (event: MessageEvent<WalLeaderMessage>) => {
				this.onMessage(event.data);
			};
		} catch {
			// BroadcastChannel not supported — become leader by default (single-tab fallback)
			logger.warn(
				'[WAL-Leader] BroadcastChannel not available — single-tab mode',
			);
			this._isLeader = true;
			return;
		}

		// Claim leadership immediately — if another leader exists, its heartbeat will preempt us
		this.claimLeadership();

		// Start checking for leader liveness
		this.leaderCheckTimer = setInterval(
			() => this.checkLeaderAlive(),
			LEADER_TIMEOUT_MS,
		);

		// Cleanup on tab close
		this.destroyRef.onDestroy(() => this.teardown());
	}

	/**
	 * Notify other tabs that a WAL entry was committed.
	 * Called by the sync engine after successful commit.
	 */
	notifyEntryCommitted(entryId: string, resourceType: string): void {
		this.broadcast({
			type: 'ENTRY_COMMITTED',
			tabId: this.tabId,
			timestamp: Date.now(),
			entryId,
			resourceType,
		});
	}

	// #endregion

	// #region Leadership

	private claimLeadership(): void {
		this._isLeader = true;
		this.currentLeaderId = this.tabId;
		this.lastLeaderHeartbeat = Date.now();

		// Broadcast claim
		this.broadcast({
			type: 'CLAIM',
			tabId: this.tabId,
			timestamp: Date.now(),
		});

		// Start heartbeating
		this.startHeartbeat();

		logger.log('[WAL-Leader] This tab is now the leader:', this.tabId.slice(0, 8));
	}

	private resignLeadership(): void {
		if (!this._isLeader) return;

		this._isLeader = false;
		this.stopHeartbeat();

		this.broadcast({
			type: 'RELEASE',
			tabId: this.tabId,
			timestamp: Date.now(),
		});

		logger.log('[WAL-Leader] Resigned leadership:', this.tabId.slice(0, 8));
	}

	private startHeartbeat(): void {
		this.stopHeartbeat();
		this.heartbeatTimer = setInterval(() => {
			if (!this._isLeader) return;
			this.broadcast({
				type: 'HEARTBEAT',
				tabId: this.tabId,
				timestamp: Date.now(),
			});
		}, HEARTBEAT_MS);
	}

	private stopHeartbeat(): void {
		if (this.heartbeatTimer) {
			clearInterval(this.heartbeatTimer);
			this.heartbeatTimer = null;
		}
	}

	/**
	 * If we are NOT the leader, check if the current leader is still alive.
	 * If no heartbeat received within LEADER_TIMEOUT_MS, claim leadership.
	 */
	private checkLeaderAlive(): void {
		if (this._isLeader) return;
		if (!this.currentLeaderId) {
			// No known leader — claim
			this.claimLeadership();
			return;
		}

		const elapsed = Date.now() - this.lastLeaderHeartbeat;
		if (elapsed > LEADER_TIMEOUT_MS) {
			logger.log(
				'[WAL-Leader] Leader timed out, claiming leadership',
			);
			this.claimLeadership();
		}
	}

	// #endregion

	// #region Message Handling

	private onMessage(msg: WalLeaderMessage): void {
		// Ignore our own messages
		if (msg.tabId === this.tabId) return;

		switch (msg.type) {
			case 'CLAIM':
				this.handleClaim(msg);
				break;
			case 'HEARTBEAT':
				this.handleHeartbeat(msg);
				break;
			case 'RELEASE':
				this.handleRelease(msg);
				break;
			case 'ENTRY_COMMITTED':
				this.handleEntryCommitted(msg);
				break;
		}
	}

	/**
	 * Another tab claims leadership.
	 * Resolve conflict: tab with lexicographically smaller ID wins.
	 */
	private handleClaim(msg: WalLeaderMessage): void {
		if (this._isLeader) {
			// Both tabs think they're leader — resolve by tab ID
			if (msg.tabId < this.tabId) {
				// Other tab wins — resign
				this.resignLeadership();
				this.currentLeaderId = msg.tabId;
				this.lastLeaderHeartbeat = msg.timestamp;
			}
			// else: we win, keep leadership (other tab will see our heartbeat)
		} else {
			this.currentLeaderId = msg.tabId;
			this.lastLeaderHeartbeat = msg.timestamp;
		}
	}

	private handleHeartbeat(msg: WalLeaderMessage): void {
		this.currentLeaderId = msg.tabId;
		this.lastLeaderHeartbeat = Date.now();

		// If we thought we were leader but another is heartbeating, resolve
		if (this._isLeader && msg.tabId < this.tabId) {
			this.resignLeadership();
		}
	}

	private handleRelease(_msg: WalLeaderMessage): void {
		if (this.currentLeaderId === _msg.tabId) {
			this.currentLeaderId = null;
			// Leader released — claim leadership
			this.claimLeadership();
		}
	}

	private handleEntryCommitted(msg: WalLeaderMessage): void {
		if (msg.entryId && msg.resourceType) {
			this._entryCommittedByOtherTab$.next({
				entryId: msg.entryId,
				resourceType: msg.resourceType,
			});
		}
	}

	// #endregion

	// #region Broadcast and Cleanup

	private broadcast(msg: WalLeaderMessage): void {
		try {
			this.channel?.postMessage(msg);
		} catch {
			// Channel closed or unavailable
		}
	}

	private teardown(): void {
		if (this._isLeader) {
			// Notify other tabs before closing
			this.broadcast({
				type: 'RELEASE',
				tabId: this.tabId,
				timestamp: Date.now(),
			});
		}

		this.stopHeartbeat();
		if (this.leaderCheckTimer) {
			clearInterval(this.leaderCheckTimer);
			this.leaderCheckTimer = null;
		}
		this.channel?.close();
		this.channel = null;
		this._entryCommittedByOtherTab$.complete();
	}

	// #endregion
}
