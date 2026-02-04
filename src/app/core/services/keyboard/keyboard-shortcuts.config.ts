/**
 * Configuración centralizada de atajos de teclado
 */
// * Default shortcut definitions for the app.

export type ShortcutCategory = 'visibility' | 'navigation' | 'actions';

export interface KeyboardShortcut {
	/** Identificador único del atajo */
	id: string;
	/** Teclas del atajo (ej: 'Ctrl+Shift+N') */
	keys: string;
	/** Descripción del atajo */
	description: string;
	/** Categoría del atajo */
	category: ShortcutCategory;
	/** Si requiere Ctrl */
	ctrl: boolean;
	/** Si requiere Shift */
	shift: boolean;
	/** Si requiere Alt */
	alt: boolean;
	/** Código de tecla (event.key o event.code) */
	key: string;
	/** Usar event.code en lugar de event.key */
	useCode?: boolean;
}

export const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
	{
		id: 'toggle-voice-button',
		keys: 'Alt+V',
		description: 'Mostrar/ocultar botón de voz',
		category: 'visibility',
		ctrl: false,
		shift: false,
		alt: true,
		key: 'v',
		useCode: false,
	},
	{
		id: 'toggle-notification-bell',
		keys: 'Alt+B',
		description: 'Abrir/cerrar panel de notificaciones',
		category: 'actions',
		ctrl: false,
		shift: false,
		alt: true,
		key: 'b',
		useCode: false,
	},
];

export const CATEGORY_LABELS: Record<ShortcutCategory, string> = {
	visibility: 'Visibilidad',
	navigation: 'Navegación',
	actions: 'Acciones',
};
