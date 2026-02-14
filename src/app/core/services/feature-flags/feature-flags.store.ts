// #region Imports
import { Injectable, computed, signal } from '@angular/core';
import type { FeatureFlagKey, FeatureFlags } from './feature-flags.models';

// #endregion
// #region Implementation
export interface FeatureFlagsSnapshot {
	isDev: boolean;
	base: FeatureFlags;
	overrides: Partial<FeatureFlags>;
	effective: FeatureFlags;
}

/**
 * Store para feature flags.
 * Mantiene base (environment), overrides y flags efectivos.
 */
@Injectable({ providedIn: 'root' })
export class FeatureFlagsStore {
	private readonly _isDev = signal(false);
	private readonly _base = signal<FeatureFlags>({} as FeatureFlags);
	private readonly _overrides = signal<Partial<FeatureFlags>>({});
	private readonly _effective = signal<FeatureFlags>({} as FeatureFlags);

	readonly isDev = this._isDev.asReadonly();
	readonly base = this._base.asReadonly();
	readonly overrides = this._overrides.asReadonly();
	readonly effective = this._effective.asReadonly();

	readonly items = computed(() => {
		const base = this._base();
		const overrides = this._overrides();
		const effective = this._effective();
		const keys = Object.keys(base) as FeatureFlagKey[];

		return keys.sort().map((key) => ({
			key,
			base: base[key],
			override: overrides[key],
			effective: effective[key],
		}));
	});

	readonly vm = computed(() => ({
		isDev: this._isDev(),
		base: this._base(),
		overrides: this._overrides(),
		effective: this._effective(),
		items: this.items(),
	}));

	setSnapshot(snapshot: FeatureFlagsSnapshot): void {
		this._isDev.set(snapshot.isDev);
		this._base.set(snapshot.base);
		this._overrides.set(snapshot.overrides);
		this._effective.set(snapshot.effective);
	}

	setOverride(key: FeatureFlagKey, value: boolean): void {
		this._overrides.update((current) => ({ ...current, [key]: value }));
	}

	clearOverrides(): void {
		this._overrides.set({});
	}

	setEffective(flags: FeatureFlags): void {
		this._effective.set(flags);
	}
}
// #endregion
