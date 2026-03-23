// #region Estadísticas Base
/**
 * Contrato mínimo para estadísticas de módulos CRUD admin.
 * Features extienden con campos específicos.
 *
 * @example
 * export interface CursosEstadisticas extends StatsBase {
 *   porNivel: Record<NivelEducativo, number>;
 * }
 */
export interface StatsBase {
	total: number;
	activos: number;
	inactivos: number;
}
// #endregion
