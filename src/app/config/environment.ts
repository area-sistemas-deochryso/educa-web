// #region Implementation
/**
 * Environment configuration for PRODUCTION
 * This file is used by default when building for production
 */
// * Production environment flags + API base URL.
export const environment = {
	production: true,

	// API Configuration - same-origin via proxy (producción: hosting proxy redirige /api → backend)
	apiUrl: '',

	// Feature flags
	showIntranetLink: true,

	// Features en desarrollo (ocultos en producción los que estén en false)
	features: {
		horarios: false,
		calendario: false,
		quickAccess: false,
		notifications: true,
		voiceRecognition: false,
		profesor: true, //? provisional de momento
		estudiante: true,
		ctestK6: false,
	},

	// Debug panels (siempre false en producción)
	debug: {
		horarioSync: false,
	},
};

export type Environment = typeof environment;
// #endregion
