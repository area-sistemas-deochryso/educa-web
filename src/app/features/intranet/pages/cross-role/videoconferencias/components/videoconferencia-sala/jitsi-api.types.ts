export const MODERATOR_TOOLBAR_BUTTONS = [
	'microphone', 'camera', 'desktop', 'chat', 'recording', 'participants-pane',
	'toggle-camera', 'fullscreen', 'raisehand', 'tileview', 'settings',
];

export const PARTICIPANT_TOOLBAR_BUTTONS = [
	'microphone', 'camera', 'chat', 'raisehand', 'tileview', 'fullscreen', 'settings',
];

export interface JitsiParticipantInfo {
	participantId: string;
	displayName: string;
	role: string;
}

export interface JitsiApi {
	dispose(): void;
	addEventListener(event: string, handler: (data: unknown) => void): void;
	executeCommand(command: string, ...args: unknown[]): void;
	getParticipantsInfo(): JitsiParticipantInfo[];
}

export interface ParticipantInfo {
	displayName: string;
	isModerator: boolean;
}

/** Normaliza un nombre para comparación: trim, lowercase, sin acentos, colapsa espacios. */
export function normalizeName(name: string | null | undefined): string {
	if (!name) return '';
	return name
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.trim()
		.replace(/\s+/g, ' ');
}

/**
 * Cuenta docentes en la sala. NO depende del flag isModerator porque JaaS no siempre
 * propaga el role moderator a clientes no-moderadores — el match se hace por nombre.
 */
export function countTeachers(
	participants: Map<string, ParticipantInfo>,
	profesorNormalized: string,
	selfIsTeacher: boolean,
): number {
	let count = selfIsTeacher ? 1 : 0;
	if (!profesorNormalized) return count;
	for (const p of participants.values()) {
		if (normalizeName(p.displayName) === profesorNormalized) count++;
	}
	return count;
}

/** Cuenta moderadores administrativos: isModerator del Jitsi pero NO matchean al docente del horario. */
export function countStaff(
	participants: Map<string, ParticipantInfo>,
	profesorNormalized: string,
	selfIsStaff: boolean,
): number {
	let count = selfIsStaff ? 1 : 0;
	for (const p of participants.values()) {
		const isTeacher = !!profesorNormalized && normalizeName(p.displayName) === profesorNormalized;
		if (p.isModerator && !isTeacher) count++;
	}
	return count;
}
