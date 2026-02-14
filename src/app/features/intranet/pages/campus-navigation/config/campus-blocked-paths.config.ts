// #region Imports
import { BlockedPath } from '../models';

/**
 * Caminos bloqueados del campus.
 *
 * Editar este archivo para bloquear pasillos por:
 * - ConstrucciÃƒÂ³n o remodelaciÃƒÂ³n
 * - Puertas cerradas con llave
 * - Mantenimiento temporal
 *
 * El algoritmo A* calcularÃƒÂ¡ rutas alternativas automÃƒÂ¡ticamente.
 *
 * Ejemplo:
 * { from: 'corridor-0-left', to: 'salon-1a', reason: 'RemodelaciÃƒÂ³n', temporary: true }
 */
// #endregion
// #region Implementation
export const CAMPUS_BLOCKED_PATHS: BlockedPath[] = [];
// #endregion
