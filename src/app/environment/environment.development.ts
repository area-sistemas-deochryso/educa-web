/**
 * Environment configuration for DEVELOPMENT
 * This file replaces environment.ts during development builds
 */
export const environment = {
	production: false,

	// API Configuration - usar HTTPS para evitar redirect que pierde headers
	apiUrl: 'https://localhost:7102',

	// Feature flags
	showIntranetLink: true,
};

export type Environment = typeof environment;
