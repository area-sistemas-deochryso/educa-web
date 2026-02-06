import { BlockedPath } from '../models';

/**
 * Caminos bloqueados del campus.
 *
 * Editar este archivo para bloquear pasillos por:
 * - Construcción o remodelación
 * - Puertas cerradas con llave
 * - Mantenimiento temporal
 *
 * El algoritmo A* calculará rutas alternativas automáticamente.
 *
 * Ejemplo:
 * { from: 'corridor-0-left', to: 'salon-1a', reason: 'Remodelación', temporary: true }
 */
export const CAMPUS_BLOCKED_PATHS: BlockedPath[] = [];
