// #region Implementation
/**
 * Environment configuration for DEVELOPMENT
 * This file replaces environment.ts during development builds
 */
// * Development environment flags + API base URL.
export const environment = {
	production: false,

	// API Configuration - same-origin via proxy (proxy.conf.json redirige /api → localhost:7102)
	apiUrl: '',

	// Feature flags
	showIntranetLink: true,

	// Features en desarrollo (visibles solo en development)
	features: {
		horarios: true,
		calendario: true,
		quickAccess: false,
		notifications: true,
		voiceRecognition: true,
		profesor: true,
		estudiante: true,
		ctestK6: true,
		videoconferencias: true,
		migracionDni: true,
	},

	// JaaS (Jitsi as a Service)
	jitsi: {
		appId: 'vpaas-magic-cookie-ab31757bc7ba406d965de2c757d33c01',
	},

	// Debug panels (solo development)
	debug: {
		horarioSync: true,
	},
};

export type Environment = typeof environment;
// #endregion
