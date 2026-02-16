// #region Implementation
/**
 * Environment configuration for PRODUCTION
 * This file is used by default when building for production
 */
// * Production environment flags + API base URL.
export const environment = {
	production: true,

	// API Configuration
	apiUrl: 'https://educa1.azurewebsites.net',

	// Feature flags
	showIntranetLink: true,

	// Features en desarrollo (ocultos en producción los que estén en false)
	features: {
		horarios: false,
		calendario: false,
		quickAccess: false,
		notifications: false,
		voiceRecognition: false,
		profesor: true, //? provisional de momento
	},
};

export type Environment = typeof environment;
// #endregion
