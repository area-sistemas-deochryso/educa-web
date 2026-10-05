// #region Implementation
/**
 * Capability of a routed component that can hold edits not yet saved.
 *
 * The component owns the prompt (it is the one with access to its own overlay
 * scope, which a route guard cannot inject) and resolves `true` when leaving
 * is safe — nothing pending, the user discarded the edits, or they were saved.
 */
export interface HasPendingChanges {
	hasPendingChanges(): boolean;
	confirmLeave(): Promise<boolean>;
}
// #endregion
