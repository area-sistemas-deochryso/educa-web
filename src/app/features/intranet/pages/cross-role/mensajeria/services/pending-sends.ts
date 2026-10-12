/**
 * Envíos propios aún sin confirmar por el servidor.
 *
 * El BE emite el eco por SignalR con la identidad efectiva ("ver como"), que puede
 * no coincidir con el DNI de sesión. El contenido pendiente identifica el eco propio
 * sin depender de la identidad.
 */
export class PendingSends {
	private items: { tempId: number; contenido: string }[] = [];

	add(tempId: number, contenido: string): void {
		this.items.push({ tempId, contenido });
	}

	remove(tempId: number): void {
		this.items = this.items.filter((p) => p.tempId !== tempId);
	}

	/** Consume y devuelve el `tempId` del envío pendiente con ese contenido, o `null`. */
	take(contenido: string): number | null {
		const pending = this.items.find((p) => p.contenido === contenido);
		if (!pending) return null;
		this.remove(pending.tempId);
		return pending.tempId;
	}
}
