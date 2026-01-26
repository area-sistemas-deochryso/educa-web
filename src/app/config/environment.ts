/**
 * Environment configuration for PRODUCTION
 * This file is used by default when building for production
 */
export const environment = {
	production: true,

	// API Configuration
	apiUrl: 'https://educacom.azurewebsites.net',

	// Feature flags
	showIntranetLink: true,

	// Features en desarrollo (ocultos en producción)
	features: {
		horarios: false,
		calendario: false,
		quickAccess: false,
		notifications: false,
		voiceRecognition: false,
	},
};

export type Environment = typeof environment;
