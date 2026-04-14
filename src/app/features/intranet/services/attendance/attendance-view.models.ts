import { Observable } from 'rxjs';

import { AsistenciaDiaConEstadisticas, EstudianteAsistencia } from '@core/services';

/** Contexto del selector actualmente activo (grado/salon → campos compartidos). */
export interface SelectorContext {
	grado: string;
	gradoCodigo: string;
	seccion: string;
}

/**
 * Configuración por-componente que abstrae las diferencias entre Director y Profesor.
 * Se pasa mediante init() en ngOnInit del componente contenedor.
 */
export interface AttendanceViewConfig {
	/** Cargar estudiantes con asistencias mensuales */
	loadEstudiantes(grado: string, seccion: string, mes: number, anio: number): Observable<EstudianteAsistencia[]>;
	/** Cargar asistencias de un día específico con estadísticas */
	loadDia(
		grado: string,
		seccion: string,
		fecha: Date,
	): Observable<AsistenciaDiaConEstadisticas>;
	/** Obtener contexto del selector actualmente seleccionado, o null si no hay selección */
	getSelectorContext(): SelectorContext | null;
	/** Callback al cambiar de mes — permite al componente re-seleccionar si el selector actual no aplica (filtro Verano) */
	onMonthChange(): void;
	/** Restaurar ID de estudiante desde storage */
	getStoredEstudianteId(): number | null;
	/** Guardar ID de estudiante en storage */
	setStoredEstudianteId(id: number): void;
}
