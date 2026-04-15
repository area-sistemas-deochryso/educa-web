/** Nota simulada: nota original + nota editada por el estudiante */
export interface NotaSimulada {
	calificacionId: number;
	notaOriginal: number | null;
	notaSimulada: number | null;
	peso: number;
}
