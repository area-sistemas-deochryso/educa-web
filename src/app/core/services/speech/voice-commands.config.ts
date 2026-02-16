// * Voice command definitions + helper filters.
import { Router } from '@angular/router';

/**
 * Interfaz para definir un comando de voz
 */
export interface VoiceCommandConfig {
	/** Patrones que activan el comando (pueden incluir regex) */
	patterns: string[];
	/** Descripción mostrada como feedback al usuario */
	description: string;
	/** Categoría del comando para organización */
	category: VoiceCommandCategory;
	/** Tipo de acción a ejecutar */
	actionType: 'navigate' | 'emit' | 'scroll' | 'custom';
	/** Ruta de navegación (solo para actionType: 'navigate') */
	route?: string;
	/** Comando a emitir (solo para actionType: 'emit') */
	emitCommand?: string;
	/** Dirección de scroll (solo para actionType: 'scroll') */
	scrollDirection?: ScrollDirection;
	/** Función personalizada (solo para actionType: 'custom') */
	customAction?: (context: VoiceCommandContext) => void;
}

export type VoiceCommandCategory =
	| 'navigation' // Navegación entre páginas
	| 'scroll' // Scroll en la página
	| 'pagination' // Paginación de tablas
	| 'modal' // Control de modales
	| 'date' // Cambio de fechas
	| 'control'; // Control general (borrar, etc.)

export type ScrollDirection = 'up' | 'down' | 'left' | 'right' | 'top' | 'bottom';

/**
 * Contexto disponible para acciones personalizadas
 */
export interface VoiceCommandContext {
	router: Router;
	emitCommand: (command: string, params?: string) => void;
	clearTranscript: () => void;
	params?: string;
}

/**
 * Configuración de meses para comandos de fecha
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
 * DEFINICIÓN CENTRALIZADA DE TODOS LOS COMANDOS DE VOZ
 * =============================================================================
 *
 * Para añadir un nuevo comando:
 * 1. Añade un objeto VoiceCommandConfig a VOICE_COMMANDS
 * 2. Elige la categoría apropiada
 * 3. Define los patterns (frases que activan el comando)
 * 4. Elige el actionType y configura según corresponda
 *
 * Tipos de acción:
 * - 'navigate': Navega a una ruta (requiere: route)
 * - 'emit': Emite un evento (requiere: emitCommand)
 * - 'scroll': Hace scroll en la página (requiere: scrollDirection)
 * - 'custom': Ejecuta una función personalizada (requiere: customAction)
 */
export const VOICE_COMMANDS: VoiceCommandConfig[] = [
	// #region NAVEGACIÓN ENTRE PÁGINAS
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
	// #region SCROLL / NAVEGACIÓN EN PÁGINA
	{
		patterns: ['baja', 'bajar', 'abajo', 'scroll abajo'],
		description: 'Bajar en la página',
		category: 'scroll',
		actionType: 'scroll',
		scrollDirection: 'down',
	},
	{
		patterns: ['sube', 'subir', 'arriba', 'scroll arriba'],
		description: 'Subir en la página',
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
		description: 'Ir al inicio de la página',
		category: 'scroll',
		actionType: 'scroll',
		scrollDirection: 'top',
	},
	{
		patterns: ['al final', 'ir al final', 'fin'],
		description: 'Ir al final de la página',
		category: 'scroll',
		actionType: 'scroll',
		scrollDirection: 'bottom',
	},

	// #endregion
	// #region PAGINACIÓN DE TABLAS
	{
		patterns: ['siguiente página', 'página siguiente', 'siguiente'],
		description: 'Ir a la siguiente página',
		category: 'pagination',
		actionType: 'emit',
		emitCommand: 'next-page',
	},
	{
		patterns: ['página anterior', 'anterior'],
		description: 'Ir a la página anterior',
		category: 'pagination',
		actionType: 'emit',
		emitCommand: 'prev-page',
	},
	{
		patterns: ['página (\\d+)', 'ir a página (\\d+)'],
		description: 'Ir a una página específica',
		category: 'pagination',
		actionType: 'emit',
		emitCommand: 'goto-page',
	},

	// #endregion
	// #region CONTROL DE MODALES
	{
		patterns: ['cerrar', 'cerrar modal', 'cerrar ventana'],
		description: 'Cerrar modal activo',
		category: 'modal',
		actionType: 'emit',
		emitCommand: 'close-modal',
	},

	// #endregion
	// #region COMANDOS DE FECHA
	{
		patterns: ['ir a (20\\d{2})', 'año (20\\d{2})', '(20\\d{2})'],
		description: 'Cambiar año',
		category: 'date',
		actionType: 'emit',
		emitCommand: 'change-year',
	},

	// #endregion
	// #region CONTROL GENERAL
	{
		patterns: ['borrar', 'limpiar', 'borrar texto'],
		description: 'Borrar el texto dictado',
		category: 'control',
		actionType: 'custom',
		customAction: (ctx) => ctx.clearTranscript(),
	},
];

/**
 * Obtiene comandos filtrados por categoría
 */
export function getCommandsByCategory(category: VoiceCommandCategory): VoiceCommandConfig[] {
	return VOICE_COMMANDS.filter((cmd) => cmd.category === category);
	// #endregion
}

/**
 * Obtiene todos los patterns de una categoría
 */
export function getPatternsByCategory(category: VoiceCommandCategory): string[] {
	return getCommandsByCategory(category).flatMap((cmd) => cmd.patterns);
}
