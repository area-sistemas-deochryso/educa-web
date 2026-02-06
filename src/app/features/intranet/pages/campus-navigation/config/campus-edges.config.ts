import { CampusEdge } from '../models';

/**
 * Configuración de conexiones entre nodos.
 * distance = tiempo estimado de caminata en segundos.
 *
 * Para configurar:
 * 1. Conecta nodos adyacentes (salones con pasillos, pasillos entre sí)
 * 2. Conecta escaleras entre pisos (mayor distancia por subir/bajar)
 * 3. Ajusta distancias según la realidad física del colegio
 *
 * IMPORTANTE: El patio solo conecta con corridor-center (vertical)
 * para evitar que las líneas de ruta crucen visualmente los salones.
 */
export const CAMPUS_EDGES: CampusEdge[] = [
	// ============ Piso 0 - Conexiones ============
	{ from: 'entrance-main', to: 'patio-central', distance: 10, bidirectional: true },
	{ from: 'patio-central', to: 'corridor-0-center', distance: 15, bidirectional: true },

	// Pasillos entre sí (banda horizontal)
	{ from: 'corridor-0-left', to: 'corridor-0-center', distance: 10, bidirectional: true },
	{ from: 'corridor-0-center', to: 'corridor-0-right', distance: 10, bidirectional: true },

	// Salones desde pasillos (conexiones cortas hacia abajo)
	{ from: 'corridor-0-left', to: 'salon-1a', distance: 5, bidirectional: true },
	{ from: 'corridor-0-left', to: 'salon-1b', distance: 5, bidirectional: true },
	{ from: 'corridor-0-right', to: 'salon-1c', distance: 5, bidirectional: true },
	{ from: 'corridor-0-right', to: 'salon-1d', distance: 5, bidirectional: true },

	// Escaleras y facilidades (conexiones cortas hacia arriba)
	{ from: 'corridor-0-left', to: 'stairs-1', distance: 8, bidirectional: true },
	{ from: 'corridor-0-right', to: 'stairs-2', distance: 8, bidirectional: true },
	{ from: 'stairs-1', to: 'bathroom-0', distance: 6, bidirectional: true },
	{ from: 'stairs-2', to: 'office-dir', distance: 6, bidirectional: true },

	// ============ Escaleras (conexión entre pisos) ============
	{ from: 'stairs-1', to: 'stairs-1-f1', distance: 25, bidirectional: true },
	{ from: 'stairs-2', to: 'stairs-2-f1', distance: 25, bidirectional: true },

	// ============ Piso 1 - Conexiones ============
	{ from: 'stairs-1-f1', to: 'corridor-1-left', distance: 8, bidirectional: true },
	{ from: 'stairs-2-f1', to: 'corridor-1-right', distance: 8, bidirectional: true },

	// Pasillos entre sí
	{ from: 'corridor-1-left', to: 'corridor-1-center', distance: 10, bidirectional: true },
	{ from: 'corridor-1-center', to: 'corridor-1-right', distance: 10, bidirectional: true },

	// Salones desde pasillos
	{ from: 'corridor-1-left', to: 'salon-2a', distance: 5, bidirectional: true },
	{ from: 'corridor-1-left', to: 'salon-2b', distance: 5, bidirectional: true },
	{ from: 'corridor-1-right', to: 'salon-3a', distance: 5, bidirectional: true },
	{ from: 'corridor-1-right', to: 'salon-3b', distance: 5, bidirectional: true },

	// Salones de la fila superior
	{ from: 'stairs-1-f1', to: 'salon-2c', distance: 6, bidirectional: true },
	{ from: 'corridor-1-left', to: 'salon-3c', distance: 8, bidirectional: true },
	{ from: 'stairs-2-f1', to: 'bathroom-1', distance: 6, bidirectional: true },
];
