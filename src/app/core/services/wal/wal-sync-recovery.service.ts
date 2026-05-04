import { Injectable, inject } from '@angular/core';
import { logger } from '@core/helpers';
import { WalService } from './wal.service';
import { WalEntry } from './models';

/**
 * Result of the boot-time recovery pass.
 * The engine consumes `migrationEntries` to emit REQUIRES_MIGRATION
 * results on its own subject — recovery is side-effect free for the engine.
 */
export interface WalRecoveryResult {
	migrationEntries: WalEntry[];
}

/**
 * Boot-time recovery for the WAL: purges resource types that migrated to
 * server-confirmed, recovers stale IN_FLIGHT entries from prior sessions,
 * cleans old committed entries, and surfaces entries that need schema
 * migration. Runs once at engine init, before processing starts.
 */
@Injectable({ providedIn: 'root' })
export class WalSyncRecovery {
	private wal = inject(WalService);

	/**
	 * Resource types that should never have WAL entries (migrated to
	 * server-confirmed). Purged on startup to prevent stuck retry loops
	 * from past sessions.
	 */
	private static readonly RESOURCE_TYPES_TO_PURGE = ['reporte-usuario'];

	async run(): Promise<WalRecoveryResult> {
		try {
			for (const rt of WalSyncRecovery.RESOURCE_TYPES_TO_PURGE) {
				await this.wal.purgeByResourceType(rt);
			}

			const [recovered, cleaned, migrationNeeded] = await Promise.all([
				this.wal.recoverInFlight(),
				this.wal.cleanup(),
				this.wal.checkSchemaMigrations(),
			]);

			if (recovered > 0 || cleaned > 0 || migrationNeeded > 0) {
				logger.log(
					`[WAL-Sync] Recovery: ${recovered} in-flight recovered, ${cleaned} old committed cleaned, ${migrationNeeded} need migration`,
				);
			}

			const migrationEntries =
				migrationNeeded > 0 ? await this.wal.getMigrationEntries() : [];
			return { migrationEntries };
		} catch (e) {
			logger.error('[WAL-Sync] Recovery error:', e);
			return { migrationEntries: [] };
		}
	}
}
