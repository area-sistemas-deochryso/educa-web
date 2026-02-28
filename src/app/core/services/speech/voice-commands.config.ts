// * Voice command definitions and helper filters.
import { Router } from '@angular/router';

/**
 * Interface to define a voice command.
 */
export interface VoiceCommandConfig {
	/** Patterns that trigger the command (regex supported). */
	patterns: string[];
	/** Description shown as feedback to the user. */
	description: string;
	/** Command category used for grouping. */
	category: VoiceCommandCategory;
	/** Action type to execute. */
	actionType: 'navigate' | 'emit' | 'scroll' | 'custom';
	/** Navigation route (only for actionType: 'navigate'). */
	route?: string;
	/** Command to emit (only for actionType: 'emit'). */
	emitCommand?: string;
	/** Scroll direction (only for actionType: 'scroll'). */
	scrollDirection?: ScrollDirection;
	/** Custom function (only for actionType: 'custom'). */
	customAction?: (context: VoiceCommandContext) => void;
}

export type VoiceCommandCategory =
	| 'navigation' // Navigation between pages
	| 'scroll' // Scroll on the page
	| 'pagination' // Table pagination
	| 'modal' // Modal control
	| 'date' // Date changes
	| 'control'; // General control (clear, etc.)

export type ScrollDirection = 'up' | 'down' | 'left' | 'right' | 'top' | 'bottom';

/**
 * Context available for custom actions.
 */
export interface VoiceCommandContext {
	router: Router;
	emitCommand: (command: string, params?: string) => void;
	clearTranscript: () => void;
	params?: string;
}

/**
 * Month names for date commands.
 */
export const MONTH_NAMES: Record<string, number> = {
	enero: 1,
	febrero: 2,
	marzo: 3,
	abril: 4,
	mayo: 5,
	junio: 6,
	julio: 7,
	agosto: 8,
	septiembre: 9,
	setiembre: 9,
	octubre: 10,
	noviembre: 11,
	diciembre: 12,
};

/**
 * =============================================================================
 * CENTRALIZED DEFINITION OF ALL VOICE COMMANDS
 * =============================================================================
 *
 * To add a new command:
 * 1. Add a VoiceCommandConfig object to VOICE_COMMANDS
 * 2. Choose the proper category
 * 3. Define patterns that trigger the command
 * 4. Choose actionType and configure required fields
 *
 * Action types:
 * - 'navigate': Navigate to a route (requires: route)
 * - 'emit': Emit an event (requires: emitCommand)
 * - 'scroll': Scroll the page (requires: scrollDirection)
 * - 'custom': Run a custom function (requires: customAction)
 */
export const VOICE_COMMANDS: VoiceCommandConfig[] = [
	// #region NAVIGATION BETWEEN PAGES
	{
		patterns: ['ir a inicio', 've a inicio', 'inicio'],
		description: 'Navegar a inicio',
		category: 'navigation',
		actionType: 'navigate',
		route: '/intranet',
	},
	{
		patterns: ['ir a asistencia', 've a asistencia', 'asistencia'],
		description: 'Navegar a asistencia',
		category: 'navigation',
		actionType: 'navigate',
		route: '/intranet/asistencia',
	},
	{
		patterns: ['ir a horario', 'ir a horarios', 've a horarios', 'horarios', 'horario'],
		description: 'Navegar a horarios',
		category: 'navigation',
		actionType: 'navigate',
		route: '/intranet/horarios',
	},
	{
		patterns: ['ir a calendario', 've a calendario', 'calendario'],
		description: 'Navegar a calendario',
		category: 'navigation',
		actionType: 'navigate',
		route: '/intranet/calendario',
	},

	// #endregion
	// #region SCROLL AND PAGE NAVIGATION
	{
		patterns: ['baja', 'bajar', 'abajo', 'scroll abajo'],
		description: 'Bajar en la pagina',
		category: 'scroll',
		actionType: 'scroll',
		scrollDirection: 'down',
	},
	{
		patterns: ['sube', 'subir', 'arriba', 'scroll arriba'],
		description: 'Subir en la pagina',
		category: 'scroll',
		actionType: 'scroll',
		scrollDirection: 'up',
	},
	{
		patterns: ['izquierda', 'scroll izquierda'],
		description: 'Scroll a la izquierda',
		category: 'scroll',
		actionType: 'scroll',
		scrollDirection: 'left',
	},
	{
		patterns: ['derecha', 'scroll derecha'],
		description: 'Scroll a la derecha',
		category: 'scroll',
		actionType: 'scroll',
		scrollDirection: 'right',
	},
	{
		patterns: ['al inicio', 'ir al inicio', 'principio'],
		description: 'Ir al inicio de la pagina',
		category: 'scroll',
		actionType: 'scroll',
		scrollDirection: 'top',
	},
	{
		patterns: ['al final', 'ir al final', 'fin'],
		description: 'Ir al final de la pagina',
		category: 'scroll',
		actionType: 'scroll',
		scrollDirection: 'bottom',
	},

	// #endregion
	// #region TABLE PAGINATION
	{
		patterns: ['siguiente pagina', 'pagina siguiente', 'siguiente'],
		description: 'Ir a la siguiente pagina',
		category: 'pagination',
		actionType: 'emit',
		emitCommand: 'next-page',
	},
	{
		patterns: ['pagina anterior', 'anterior'],
		description: 'Ir a la pagina anterior',
		category: 'pagination',
		actionType: 'emit',
		emitCommand: 'prev-page',
	},
	{
		patterns: ['pagina (\\d+)', 'ir a pagina (\\d+)'],
		description: 'Ir a una pagina especifica',
		category: 'pagination',
		actionType: 'emit',
		emitCommand: 'goto-page',
	},

	// #endregion
	// #region MODAL CONTROL
	{
		patterns: ['cerrar', 'cerrar modal', 'cerrar ventana'],
		description: 'Cerrar modal activo',
		category: 'modal',
		actionType: 'emit',
		emitCommand: 'close-modal',
	},

	// #endregion
	// #region DATE COMMANDS
	{
		patterns: ['ir a (20\\d{2})', 'anio (20\\d{2})', '(20\\d{2})'],
		description: 'Cambiar anio',
		category: 'date',
		actionType: 'emit',
		emitCommand: 'change-year',
	},

	// #endregion
	// #region GENERAL CONTROL
	{
		patterns: ['borrar', 'limpiar', 'borrar texto'],
		description: 'Borrar el texto dictado',
		category: 'control',
		actionType: 'custom',
		customAction: (ctx) => ctx.clearTranscript(),
	},
];

/**
 * Get commands filtered by category.
 */
export function getCommandsByCategory(category: VoiceCommandCategory): VoiceCommandConfig[] {
	return VOICE_COMMANDS.filter((cmd) => cmd.category === category);
	// #endregion
}

/**
 * Get all patterns for a category.
 */
export function getPatternsByCategory(category: VoiceCommandCategory): string[] {
	return getCommandsByCategory(category).flatMap((cmd) => cmd.patterns);
}

