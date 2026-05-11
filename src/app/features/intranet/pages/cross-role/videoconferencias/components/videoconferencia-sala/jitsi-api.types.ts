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
