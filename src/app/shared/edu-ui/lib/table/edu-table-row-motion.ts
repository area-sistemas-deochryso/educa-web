/** Quitar hasta N filas a la vez se anima; más que eso es filtro/recarga, no una baja puntual. */
export const MAX_ANIMATED_REMOVALS = 3;

/** Respaldo si `animationend` nunca llega (fila oculta, `display: none`). */
export const EXIT_FALLBACK_MS = 1500;

export interface LeavingRow<T> {
	row: T;
	key: unknown;
	index: number;
}

export interface DisplayRow<T> {
	row: T;
	key: unknown;
	leaving: boolean;
}

const CHANGED_ROW = 'motion-flash';
const CHANGED_CELL = 'motion-value-bounce';

/** Texto visible de cada celda de la fila: es lo que el usuario percibe como "valor". */
export function cellTexts(row: Element): string[] {
	return Array.from(row.children, (cell) => cell.textContent?.trim() ?? '');
}

/**
 * Destella la fila y rebota el contenido de las celdas cuyo texto cambió respecto al snapshot previo.
 */
export function flashChangedRow(
	row: Element,
	previous: readonly string[],
	current: readonly string[],
): void {
	row.classList.remove(CHANGED_ROW);
	void (row as HTMLElement).offsetWidth;
	row.classList.add(CHANGED_ROW);
	Array.from(row.children).forEach((cell, i) => {
		if (previous[i] === current[i]) return;
		for (const child of Array.from(cell.children)) {
			child.classList.remove(CHANGED_CELL);
			void (child as HTMLElement).offsetWidth;
			child.classList.add(CHANGED_CELL);
		}
	});
}

export function hasChanged(previous: readonly string[] | undefined, current: readonly string[]): boolean {
	return !!previous && (previous.length !== current.length || previous.some((t, i) => t !== current[i]));
}

/**
 * Salida en dos fases sobre la fila retenida: deslizamiento (`edu-row--leaving`) y pliegue del hueco
 * (`edu-row--folding`). Llama `done` una sola vez al terminar (o por respaldo).
 */
export function playRowExit(row: HTMLElement, done: () => void): void {
	const firstCell = row.firstElementChild as HTMLElement | null;
	row.style.setProperty('--row-h', `${row.offsetHeight}px`);
	row.style.setProperty(
		'--row-pad',
		firstCell ? getComputedStyle(firstCell).paddingTop : '0px',
	);
	row.style.setProperty('--row-lh', firstCell ? getComputedStyle(firstCell).lineHeight : '1.5');

	let finished = false;
	const finish = (): void => {
		if (finished) return;
		finished = true;
		clearTimeout(timer);
		row.removeEventListener('animationend', onEnd);
		done();
	};
	const onEnd = (event: AnimationEvent): void => {
		if (event.target !== row) return;
		// Emulated encapsulation prefixes keyframe names (`_ngcontent-ng-cNNN_edu-row-fold`), so match by suffix.
		if (event.animationName.endsWith('edu-row-slide-out')) row.classList.add('edu-row--folding');
		else if (event.animationName.endsWith('edu-row-fold')) finish();
	};
	const timer = setTimeout(finish, EXIT_FALLBACK_MS);
	row.addEventListener('animationend', onEnd);
	row.classList.add('edu-row--leaving');
}
