/**
 * Cada cuánto el moderador avisa que sigue en la sala. Debe ser bastante menor que `AperturaFueraDeHorario.PresenciaTtl`
 * del BE (2 min): tolera un latido perdido y el throttling de pestañas en segundo plano (~1/min).
 */
export const PRESENCIA_INTERVAL_MS = 45_000;

/** Emite un latido de inmediato y luego uno cada `PRESENCIA_INTERVAL_MS`. Devuelve la función que lo detiene. */
export function startPresenciaHeartbeat(enviar: () => void): () => void {
	enviar();
	const timer = setInterval(enviar, PRESENCIA_INTERVAL_MS);
	return () => clearInterval(timer);
}
