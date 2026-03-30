// #region Implementation
/**
 * Environment configuration for CAPACITOR (Android/iOS)
 * No reverse proxy — calls go directly to Azure backend
 */
export const environment = {
	production: true,

	// API Configuration - direct to Azure (no proxy in native app)
	apiUrl: 'https://educa1.azurewebsites.net',

	// Feature flags
	showIntranetLink: true,

	// Features
	features: {
		horarios: true,
		calendario: true,
		quickAccess: true,
		notifications: false,
		voiceRecognition: false,
		profesor: true,
		estudiante: true,
		ctestK6: false,
		videoconferencias: true,
		campusNavigation: false,
	},

	// JaaS (Jitsi as a Service)
	jitsi: {
		appId: '',
	},

	// Debug panels
	debug: {
		horarioSync: false,
	},
};

export type Environment = typeof environment;
// #endregion
