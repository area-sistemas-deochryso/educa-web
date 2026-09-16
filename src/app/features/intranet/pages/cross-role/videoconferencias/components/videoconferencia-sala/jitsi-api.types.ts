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

/**
 * Decodifica el claim `exp` (segundos epoch) del payload de un JWT sin validar la firma.
 * Uso exclusivamente client-side para programar el aviso de expiración — nunca para autorización.
 */
export function decodeJwtExp(jwt: string): number | null {
	const payload = jwt.split('.')[1];
	if (!payload) return null;

	try {
		const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
		const decoded = JSON.parse(atob(normalized)) as { exp?: unknown };
		return typeof decoded.exp === 'number' ? decoded.exp : null;
	} catch {
		return null;
	}
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

/** Opciones del constructor `JitsiMeetExternalAPI` — extraído para mantener `initJitsi` corto. */
export function buildJitsiOptions(params: {
	appId: string;
	roomName: string;
	parentNode: HTMLElement;
	jwt: string;
	displayName: string;
	cursoNombre: string;
	toolbarButtons: string[];
}): Record<string, unknown> {
	return {
		// JaaS requiere roomName con formato: appId/roomName
		roomName: `${params.appId}/${params.roomName}`,
		parentNode: params.parentNode,
		jwt: params.jwt,
		width: '100%',
		height: '100%',
		lang: 'es',
		userInfo: { displayName: params.displayName || 'Participante' },
		configOverwrite: {
			startWithAudioMuted: true,
			startWithVideoMuted: true,
			prejoinPageEnabled: false,
			disableDeepLinking: true,
			toolbarButtons: params.toolbarButtons,
			enableClosePage: false,
			hideConferenceSubject: false,
			subject: params.cursoNombre,
		},
		interfaceConfigOverwrite: {
			SHOW_JITSI_WATERMARK: false,
			SHOW_WATERMARK_FOR_GUESTS: false,
			SHOW_BRAND_WATERMARK: false,
			SHOW_CHROME_EXTENSION_BANNER: false,
			MOBILE_APP_PROMO: false,
			TOOLBAR_ALWAYS_VISIBLE: true,
			DEFAULT_BACKGROUND: '#1a1a2e',
		},
	};
}

// #region Reducers del mapa de participantes (inmutables — cada uno retorna un Map nuevo)

export function addParticipant(
	map: Map<string, ParticipantInfo>,
	id: string,
	displayName: string,
): Map<string, ParticipantInfo> {
	const next = new Map(map);
	next.set(id, { displayName: displayName || '', isModerator: false });
	return next;
}

export function removeParticipant(map: Map<string, ParticipantInfo>, id: string): Map<string, ParticipantInfo> {
	const next = new Map(map);
	next.delete(id);
	return next;
}

export function setParticipantModerator(
	map: Map<string, ParticipantInfo>,
	id: string,
	isModerator: boolean,
): Map<string, ParticipantInfo> {
	const current = map.get(id);
	if (!current) return map;
	const next = new Map(map);
	next.set(id, { ...current, isModerator });
	return next;
}

export function renameParticipant(
	map: Map<string, ParticipantInfo>,
	id: string,
	displayName: string,
): Map<string, ParticipantInfo> {
	const current = map.get(id);
	if (!current) return map;
	const next = new Map(map);
	next.set(id, { ...current, displayName });
	return next;
}

/**
 * Reconcilia el mapa contra `getParticipantsInfo()` (sincrónico). SOLO actualiza entries ya
 * conocidas (alta y baja vienen exclusivamente de participantJoined/participantLeft) — el
 * participantId de Jitsi puede tener formato distinto entre el evento (short id) y
 * getParticipantsInfo() (JID full), así que agregar entries nuevas acá duplicaría participantes.
 */
export function reconcileParticipantRoles(
	info: JitsiParticipantInfo[],
	map: Map<string, ParticipantInfo>,
): Map<string, ParticipantInfo> {
	const next = new Map(map);
	for (const p of info) {
		const current = next.get(p.participantId);
		if (!current) continue;
		next.set(p.participantId, { displayName: p.displayName || current.displayName, isModerator: p.role === 'moderator' });
	}
	return next;
}

// #endregion
