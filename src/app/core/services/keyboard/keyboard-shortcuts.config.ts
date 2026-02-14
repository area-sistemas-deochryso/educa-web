// #region Implementation
/**
 * ConfiguraciÃ³n centralizada de atajos de teclado
 */
// * Default shortcut definitions for the app.

export type ShortcutCategory = 'visibility' | 'navigation' | 'actions';

export interface KeyboardShortcut {
	/** Identificador Ãºnico del atajo */
	id: string;
	/** Teclas del atajo (ej: 'Ctrl+Shift+N') */
	keys: string;
	/** DescripciÃ³n del atajo */
	description: string;
	/** CategorÃ­a del atajo */
	category: ShortcutCategory;
	/** Si requiere Ctrl */
	ctrl: boolean;
	/** Si requiere Shift */
	shift: boolean;
	/** Si requiere Alt */
	alt: boolean;
	/** CÃ³digo de tecla (event.key o event.code) */
	key: string;
	/** Usar event.code en lugar de event.key */
	useCode?: boolean;
}

export const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
	{
		id: 'toggle-voice-button',
		keys: 'Alt+V',
		description: 'Mostrar/ocultar botÃ³n de voz',
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
	navigation: 'NavegaciÃ³n',
	actions: 'Acciones',
};
// #endregion
