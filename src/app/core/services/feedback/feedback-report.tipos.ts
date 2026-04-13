// #region Catálogo de tipos de reporte
/**
 * Catálogo de tipos de reportes de usuario.
 * El `value` DEBE coincidir con Educa.API → Constants/Sistema/ReporteUsuarioTipos.cs.
 */
export const REPORTE_TIPOS = [
	'PAGINA_LENTA',
	'WEB_LENTA',
	'FALLO_ACTUALIZAR',
	'INCONSISTENCIA_DATOS',
	'DATOS_INVALIDOS',
	'DATOS_VIEJOS',
	'ENLACE_ROTO',
	'PDF_NO_GENERA',
	'EXCEL_MAL_GENERADO',
	'RECURSOS_NO_VISIBLES',
	'ERROR_VISUAL_PC',
	'ERROR_VISUAL_MOVIL',
	'FORMULARIO_INEFICIENTE',
	'NAVEGACION_CONFUSA',
	'CONTENIDO_DESORDENADO',
	'EXCESO_MODALES',
	'ERROR_SERVIDOR',
] as const;

export type ReporteTipo = (typeof REPORTE_TIPOS)[number];

export interface ReporteTipoOption {
	label: string;
	value: ReporteTipo;
	icon: string;
	grupo: 'rendimiento' | 'datos' | 'recursos' | 'visual' | 'ux' | 'servidor';
}

/**
 * Etiquetas amigables + iconos PrimeNG, agrupadas por concepto.
 * Orden optimizado para que el usuario encuentre rápido el tipo más cercano a su problema.
 */
export const REPORTE_TIPO_OPTIONS: ReporteTipoOption[] = [
	// Rendimiento
	{ value: 'PAGINA_LENTA', label: 'La página tarda en cargar', icon: 'pi pi-hourglass', grupo: 'rendimiento' },
	{ value: 'WEB_LENTA', label: 'Toda la web va lenta', icon: 'pi pi-wifi', grupo: 'rendimiento' },
	{ value: 'FALLO_ACTUALIZAR', label: 'No puedo actualizar datos', icon: 'pi pi-refresh', grupo: 'rendimiento' },

	// Datos
	{ value: 'INCONSISTENCIA_DATOS', label: 'Los datos no cuadran entre pantallas', icon: 'pi pi-exclamation-triangle', grupo: 'datos' },
	{ value: 'DATOS_INVALIDOS', label: 'Hay datos incorrectos o inválidos', icon: 'pi pi-times-circle', grupo: 'datos' },
	{ value: 'DATOS_VIEJOS', label: 'Veo datos viejos que deberían haberse actualizado', icon: 'pi pi-history', grupo: 'datos' },

	// Recursos / archivos
	{ value: 'ENLACE_ROTO', label: 'Un enlace o botón no funciona', icon: 'pi pi-link', grupo: 'recursos' },
	{ value: 'PDF_NO_GENERA', label: 'Un PDF no se genera', icon: 'pi pi-file-pdf', grupo: 'recursos' },
	{ value: 'EXCEL_MAL_GENERADO', label: 'Un Excel está mal generado', icon: 'pi pi-file-excel', grupo: 'recursos' },
	{ value: 'RECURSOS_NO_VISIBLES', label: 'No visualizo mis recursos/archivos', icon: 'pi pi-eye-slash', grupo: 'recursos' },

	// Visual / responsive
	{ value: 'ERROR_VISUAL_PC', label: 'Error visual en computadora o laptop', icon: 'pi pi-desktop', grupo: 'visual' },
	{ value: 'ERROR_VISUAL_MOVIL', label: 'Error visual en el móvil', icon: 'pi pi-mobile', grupo: 'visual' },

	// UX
	{ value: 'FORMULARIO_INEFICIENTE', label: 'Un formulario es complicado o ineficiente', icon: 'pi pi-pencil', grupo: 'ux' },
	{ value: 'NAVEGACION_CONFUSA', label: 'La navegación es confusa', icon: 'pi pi-compass', grupo: 'ux' },
	{ value: 'CONTENIDO_DESORDENADO', label: 'El contenido está desordenado', icon: 'pi pi-sort-alt', grupo: 'ux' },
	{ value: 'EXCESO_MODALES', label: 'Hay demasiados modales/ventanas', icon: 'pi pi-window-maximize', grupo: 'ux' },

	// Servidor
	{ value: 'ERROR_SERVIDOR', label: 'Error de servidor / no me deja hacer nada', icon: 'pi pi-server', grupo: 'servidor' },
];

export const REPORTE_TIPO_LABEL_MAP: Record<ReporteTipo, string> = REPORTE_TIPO_OPTIONS.reduce(
	(acc, opt) => ({ ...acc, [opt.value]: opt.label }),
	{} as Record<ReporteTipo, string>,
);
// #endregion
