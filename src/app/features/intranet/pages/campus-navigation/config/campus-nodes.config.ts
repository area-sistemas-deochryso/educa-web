import { CampusNode } from '../models';

/**
 * ConfiguraciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n de nodos del campus.
 * Cada nodo representa un punto fÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­sico: salÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n, pasillo, escaleras, entrada, etc.
 *
 * Coordenadas: Sistema relativo 0-1000 (mapeado al viewBox del SVG)
 * salonId: Debe coincidir con Salon.SAL_CodID del backend
 *
 * Layout por bandas horizontales (evita que las lÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­neas de ruta crucen salones):
 * - yÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â°Ãƒâ€¹Ã¢â‚¬Â 200: Facilidades superiores (baÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â±os, oficinas)
 * - yÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â°Ãƒâ€¹Ã¢â‚¬Â 320: Escaleras
 * - yÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â°Ãƒâ€¹Ã¢â‚¬Â 420: Banda de pasillos (conexiÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n horizontal principal)
 * - yÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â°Ãƒâ€¹Ã¢â‚¬Â 560: Fila de salones
 * - yÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â°Ãƒâ€¹Ã¢â‚¬Â 650: Patio central
 * - yÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â°Ãƒâ€¹Ã¢â‚¬Â 755: Entrada principal
 */
export const CAMPUS_NODES: CampusNode[] = [
	// #region Piso 0 (Planta Baja)
	{
		id: 'entrance-main',
		type: 'entrance',
		label: 'Entrada Principal',
		floor: 0,
		x: 500,
		y: 755,
		width: 80,
		height: 35,
	},
	{
		id: 'patio-central',
		type: 'patio',
		label: 'Patio Central',
		floor: 0,
		x: 500,
		y: 650,
		width: 180,
		height: 70,
	},
	{ id: 'corridor-0-left', type: 'corridor', label: 'Pasillo Izquierdo', floor: 0, x: 250, y: 420 },
	{ id: 'corridor-0-center', type: 'corridor', label: 'Pasillo Central', floor: 0, x: 500, y: 420 },
	{ id: 'corridor-0-right', type: 'corridor', label: 'Pasillo Derecho', floor: 0, x: 750, y: 420 },
	{
		id: 'stairs-1',
		type: 'stairs',
		label: 'Escaleras 1',
		floor: 0,
		x: 150,
		y: 320,
		width: 45,
		height: 45,
	},
	{
		id: 'stairs-2',
		type: 'stairs',
		label: 'Escaleras 2',
		floor: 0,
		x: 850,
		y: 320,
		width: 45,
		height: 45,
	},

	// Salones Piso 0
	{
		id: 'salon-1a',
		type: 'classroom',
		label: '1ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â° A',
		floor: 0,
		x: 150,
		y: 560,
		width: 90,
		height: 60,
		salonId: 1,
	},
	{
		id: 'salon-1b',
		type: 'classroom',
		label: '1ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â° B',
		floor: 0,
		x: 350,
		y: 560,
		width: 90,
		height: 60,
		salonId: 2,
	},
	{
		id: 'salon-1c',
		type: 'classroom',
		label: '1ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â° C',
		floor: 0,
		x: 650,
		y: 560,
		width: 90,
		height: 60,
		salonId: 3,
	},
	{
		id: 'salon-1d',
		type: 'classroom',
		label: '1ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â° D',
		floor: 0,
		x: 850,
		y: 560,
		width: 90,
		height: 60,
		salonId: 4,
	},
	{
		id: 'office-dir',
		type: 'office',
		label: 'DirecciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n',
		floor: 0,
		x: 850,
		y: 200,
		width: 90,
		height: 60,
	},
	{
		id: 'bathroom-0',
		type: 'bathroom',
		label: 'BaÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â±os P0',
		floor: 0,
		x: 150,
		y: 200,
		width: 70,
		height: 50,
	},

	// #endregion
	// #region Piso 1
	{
		id: 'stairs-1-f1',
		type: 'stairs',
		label: 'Escaleras 1',
		floor: 1,
		x: 150,
		y: 320,
		width: 45,
		height: 45,
	},
	{
		id: 'stairs-2-f1',
		type: 'stairs',
		label: 'Escaleras 2',
		floor: 1,
		x: 850,
		y: 320,
		width: 45,
		height: 45,
	},
	{ id: 'corridor-1-left', type: 'corridor', label: 'Pasillo Izquierdo', floor: 1, x: 250, y: 420 },
	{ id: 'corridor-1-center', type: 'corridor', label: 'Pasillo Central', floor: 1, x: 500, y: 420 },
	{ id: 'corridor-1-right', type: 'corridor', label: 'Pasillo Derecho', floor: 1, x: 750, y: 420 },

	// Salones Piso 1
	{
		id: 'salon-2a',
		type: 'classroom',
		label: '2ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â° A',
		floor: 1,
		x: 150,
		y: 560,
		width: 90,
		height: 60,
		salonId: 5,
	},
	{
		id: 'salon-2b',
		type: 'classroom',
		label: '2ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â° B',
		floor: 1,
		x: 350,
		y: 560,
		width: 90,
		height: 60,
		salonId: 6,
	},
	{
		id: 'salon-3a',
		type: 'classroom',
		label: '3ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â° A',
		floor: 1,
		x: 650,
		y: 560,
		width: 90,
		height: 60,
		salonId: 7,
	},
	{
		id: 'salon-3b',
		type: 'classroom',
		label: '3ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â° B',
		floor: 1,
		x: 850,
		y: 560,
		width: 90,
		height: 60,
		salonId: 8,
	},
	{
		id: 'salon-2c',
		type: 'classroom',
		label: '2ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â° C',
		floor: 1,
		x: 150,
		y: 200,
		width: 90,
		height: 60,
		salonId: 9,
	},
	{
		id: 'salon-3c',
		type: 'classroom',
		label: '3ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â° C',
		floor: 1,
		x: 350,
		y: 200,
		width: 90,
		height: 60,
		salonId: 10,
	},
	{
		id: 'bathroom-1',
		type: 'bathroom',
		label: 'BaÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â±os P1',
		floor: 1,
		x: 850,
		y: 200,
		width: 70,
		height: 50,
	},
];
	// #endregion
