import type { ConfiguracionCalificacionListDto } from '@data/models';
import type { GradeScale } from './grade-scale.models';
import { VigesimalScale } from './vigesimal-scale.adapter';
import { LiteralScale } from './literal-scale.adapter';

/**
 * Crea la escala apropiada a partir de la configuración del backend.
 *
 * Este es el punto de entrada principal: recibe el DTO del servidor
 * y retorna la implementación de GradeScale correcta.
 *
 * @param config Configuración del backend (null = vigesimal default)
 */
export function createGradeScale(config: ConfiguracionCalificacionListDto | null): GradeScale {
	if (config?.tipoCalificacion === 'LITERAL' && config.literales.length > 0) {
		return new LiteralScale(config.literales, config.notaMinAprobatoria);
	}
	return new VigesimalScale(config?.notaMinAprobatoria);
}
