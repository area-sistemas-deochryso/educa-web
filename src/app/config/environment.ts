/**
 * Environment configuration for PRODUCTION
 * This file is used by default when building for production
 */
export const environment = {
	production: true,

	// API Configuration
	apiUrl: 'https://educacom.azurewebsites.net',

	// Feature flags
	showIntranetLink: true, //? volver a false para ocultar de nuevo el botón de intranet
};

export type Environment = typeof environment;
