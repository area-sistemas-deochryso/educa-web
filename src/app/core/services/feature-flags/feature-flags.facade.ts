// #region Imports
import { inject, Inject, Injectable, Optional, isDevMode } from '@angular/core';
import { environment } from '@config';
import {
	safeGetLocalStorage,
	safeRemoveLocalStorage,
	safeSetLocalStorage,
} from '@core/helpers';

import {
	FEATURE_FLAGS_CONFIG,
	FeatureFlagKey,
	FeatureFlags,
	FeatureFlagsConfig,
} from './feature-flags.models';
import { FeatureFlagsStore } from './feature-flags.store';

// #endregion
// #region Implementation
const DEFAULTS: Required<FeatureFlagsConfig> = {
	enabled: true,
	storageKey: 'FEATURE_FLAGS',
};

/**
 * Facade para feature flags con overrides en localStorage (solo dev).
 */
@Injectable({ providedIn: 'root' })
export class FeatureFlagsFacade {
	private readonly store = inject(FeatureFlagsStore);
	private cfg: Required<FeatureFlagsConfig>;
	private base: FeatureFlags;
	private overrides: Partial<FeatureFlags> = {};

	readonly vm = this.store.vm;

	constructor(
		@Optional() @Inject(FEATURE_FLAGS_CONFIG) cfg?: FeatureFlagsConfig,
	) {
		this.cfg = { ...DEFAULTS, ...(cfg ?? {}) };
		this.base = environment.features;
		this.refreshFromStorage();
	}

	get isDev(): boolean {
		return isDevMode() && !environment.production;
	}

	isEnabled(key: FeatureFlagKey): boolean {
		return this.store.effective()[key];
	}

	setFlag(key: FeatureFlagKey, value: boolean, persist = true): void {
		if (!this.isDev || !this.cfg.enabled) return;
		this.overrides = { ...this.overrides, [key]: value };
		this.updateStore();
		if (persist) {
			safeSetLocalStorage(this.cfg.storageKey, JSON.stringify(this.overrides));
		}
	}

	toggleFlag(key: FeatureFlagKey, persist = true): void {
		const current = this.store.effective()[key];
		this.setFlag(key, !current, persist);
	}

	resetFlag(key: FeatureFlagKey, persist = true): void {
		if (!this.isDev || !this.cfg.enabled) return;
		const next = { ...this.overrides };
		delete next[key];
		this.overrides = next;
		this.updateStore();
		if (persist) {
			if (Object.keys(this.overrides).length === 0) {
				safeRemoveLocalStorage(this.cfg.storageKey);
			} else {
				safeSetLocalStorage(this.cfg.storageKey, JSON.stringify(this.overrides));
			}
		}
	}

	clearOverrides(): void {
		this.overrides = {};
		safeRemoveLocalStorage(this.cfg.storageKey);
		this.updateStore();
	}

	refreshFromStorage(): void {
		this.base = environment.features;
		this.overrides = this.isDev && this.cfg.enabled ? this.loadOverrides() : {};
		this.updateStore();
	}

	private updateStore(): void {
		const isDev = this.isDev;
		const overrides = isDev && this.cfg.enabled ? this.overrides : {};
		const effective = { ...this.base, ...overrides };

		this.store.setSnapshot({
			isDev,
			base: this.base,
			overrides,
			effective,
		});
	}

	private loadOverrides(): Partial<FeatureFlags> {
		const raw = safeGetLocalStorage(this.cfg.storageKey);
		if (!raw) return {};

		try {
			const parsed = JSON.parse(raw) as Record<string, unknown>;
			if (!parsed || typeof parsed !== 'object') return {};

			const overrides: Partial<FeatureFlags> = {};
			for (const key of Object.keys(this.base)) {
				const value = parsed[key];
				if (typeof value === 'boolean') {
					(overrides as Record<string, boolean>)[key] = value;
				}
			}

			return overrides;
		} catch {
			return {};
		}
	}
}
// #endregion
