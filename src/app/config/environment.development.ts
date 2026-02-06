/**
 * Environment configuration for DEVELOPMENT
 * This file replaces environment.ts during development builds
 */
// * Development environment flags + API base URL.
export const environment = {
	production: false,

	// API Configuration - usar HTTPS para evitar redirect que pierde headers
	apiUrl: 'https://localhost:7102',

	// Feature flags
	showIntranetLink: true,

	// Features en desarrollo (visibles solo en development)
	features: {
		horarios: true,
		calendario: true,
		quickAccess: true,
		notifications: true,
		voiceRecognition: true,
		profesor: true,
	},
};

export type Environment = typeof environment;
