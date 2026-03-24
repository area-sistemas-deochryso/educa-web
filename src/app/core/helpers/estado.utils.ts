// #region Types
type EstadoSeverity = 'success' | 'danger';

interface EstadoConfig {
	label: string;
	severity: EstadoSeverity;
	icon: string;
	toggleIcon: string;
	toggleLabel: string;
}

const ACTIVO: EstadoConfig = {
	label: 'Activo',
	severity: 'success',
	icon: 'pi pi-check-circle',
	toggleIcon: 'pi pi-ban',
	toggleLabel: 'Desactivar',
};

const INACTIVO: EstadoConfig = {
	label: 'Inactivo',
	severity: 'danger',
	icon: 'pi pi-times-circle',
	toggleIcon: 'pi pi-check',
	toggleLabel: 'Activar',
};
// #endregion

// #region Lookup functions
/**
 * Returns the full config for a boolean/numeric estado.
 *
 * @example
 * getEstadoConfig(true);  // { label: 'Activo', severity: 'success', ... }
 * getEstadoConfig(0);     // { label: 'Inactivo', severity: 'danger', ... }
 */
export function getEstadoConfig(estado: boolean | number): EstadoConfig {
	return estado ? ACTIVO : INACTIVO;
}

/** 'Activo' | 'Inactivo' */
export function getEstadoLabel(estado: boolean | number): string {
	return estado ? ACTIVO.label : INACTIVO.label;
}

/** 'success' | 'danger' */
export function getEstadoSeverity(estado: boolean | number): EstadoSeverity {
	return estado ? ACTIVO.severity : INACTIVO.severity;
}

/** Icon for toggle action: ban (to deactivate) or check (to activate) */
export function getEstadoToggleIcon(estado: boolean | number): string {
	return estado ? ACTIVO.toggleIcon : INACTIVO.toggleIcon;
}

/** Label for toggle action: 'Desactivar' | 'Activar' */
export function getEstadoToggleLabel(estado: boolean | number): string {
	return estado ? ACTIVO.toggleLabel : INACTIVO.toggleLabel;
}
// #endregion
