import type { EduTagSeverity } from '@edu-ui';

/**
 * Significado de cada valor que MailerSend puede devolver en la columna «Detalle» de `GET /v1/emails`.
 * - `suppression`: `suppression_reason` (solo en emails `rejected`).
 * - `interaction`: `interaction[]` (lo que hizo el destinatario con un email ya entregado).
 * Fuente de los códigos: https://developers.mailersend.com/api/v1/email/emails
 */
export type DetailKind = 'suppression' | 'interaction';

export interface DetailInfo {
	kind: DetailKind;
	/** Valor tal cual lo devuelve MailerSend. */
	code: string;
	/** Nombre corto en español para el chip. */
	label: string;
	severity: EduTagSeverity;
	/** Una línea para la leyenda. */
	summary: string;
	/** Explicación completa para el modal. */
	meaning: string;
	/** Qué conviene hacer (o por qué no hace falta nada). */
	action: string;
}

const DETAILS: DetailInfo[] = [
	// #region Motivos de rechazo (suppression_reason)
	{
		kind: 'suppression',
		code: 'on_hold',
		label: 'En espera',
		severity: 'warn',
		summary: 'MailerSend retiene los envíos a esta dirección por fallos temporales repetidos.',
		meaning:
			'La dirección del destinatario está en la lista «On hold» de MailerSend. MailerSend la pone ahí cuando los envíos fallan de forma temporal varias veces (por ejemplo, buzón lleno o servidor del destinatario no disponible). Mientras siga en espera, MailerSend rechaza los nuevos envíos a esa dirección sin intentarlos.',
		action:
			'Confirma que el correo del apoderado exista y tenga espacio. Si es válido, quita la dirección de la lista en MailerSend (Suppressions → On hold) para que vuelva a recibir. Si el problema persiste, pide un correo alternativo.',
	},
	{
		kind: 'suppression',
		code: 'hard_bounced',
		label: 'Rebote permanente',
		severity: 'danger',
		summary: 'La dirección no existe o su dominio no puede recibir correos.',
		meaning:
			'El servidor del destinatario respondió que la dirección no existe o que el dominio es inválido. Es un fallo permanente: MailerSend suprime la dirección para no seguir enviando a un correo que no existe y proteger la reputación del dominio emisor.',
		action:
			'Corrige el correo en la ficha del estudiante o apoderado (revisa «Validación de datos»). Insistir con la misma dirección no sirve: seguirá rechazándose.',
	},
	{
		kind: 'suppression',
		code: 'unsubscribed',
		label: 'Se dio de baja',
		severity: 'secondary',
		summary: 'El destinatario pidió no recibir más correos.',
		meaning:
			'El destinatario usó el enlace de baja de un correo anterior. MailerSend respeta esa decisión y rechaza los envíos posteriores a esa dirección.',
		action:
			'No hay nada que reenviar. Si fue por error, el destinatario debe volver a suscribirse o puedes quitar la baja en MailerSend (Suppressions → Unsubscribes), con su consentimiento.',
	},
	{
		kind: 'suppression',
		code: 'spam_complained',
		label: 'Marcado como spam',
		severity: 'danger',
		summary: 'El destinatario marcó un correo anterior como spam.',
		meaning:
			'Una queja de spam anterior llevó a MailerSend a suprimir la dirección. Seguir enviando a quien se queja daña la reputación del dominio emisor, por eso MailerSend rechaza los envíos.',
		action:
			'No insistas con esa dirección. Pide al apoderado un correo distinto o que indique desde su proveedor que los correos del colegio son confiables.',
	},
	{
		kind: 'suppression',
		code: 'blocklisted',
		label: 'En lista de bloqueo',
		severity: 'danger',
		summary: 'La dirección está bloqueada en la lista de bloqueo de la cuenta.',
		meaning:
			'La dirección o su dominio figura en la lista de bloqueo (blocklist) de la cuenta de MailerSend, por lo que ningún envío sale hacia ella.',
		action:
			'Revisa en MailerSend (Suppressions → Blocklist) por qué fue agregada. Si el bloqueo fue un error, elimínala de la lista.',
	},
	// #endregion

	// #region Interacción del destinatario (interaction[])
	{
		kind: 'interaction',
		code: 'opened',
		label: 'Abierto',
		severity: 'info',
		summary: 'El destinatario abrió el correo.',
		meaning:
			'MailerSend detectó que el correo se abrió (mediante un pixel de seguimiento). Algunos clientes de correo bloquean ese pixel, por lo que puede haber correos leídos que no figuren como abiertos.',
		action: 'No requiere acción.',
	},
	{
		kind: 'interaction',
		code: 'clicked',
		label: 'Con clic',
		severity: 'success',
		summary: 'El destinatario hizo clic en un enlace del correo.',
		meaning: 'El destinatario hizo clic al menos una vez en un enlace del correo.',
		action: 'No requiere acción.',
	},
	{
		kind: 'interaction',
		code: 'unsubscribed',
		label: 'Baja desde el correo',
		severity: 'warn',
		summary: 'El destinatario se dio de baja desde este correo.',
		meaning:
			'El destinatario usó el enlace de baja incluido en este correo. A partir de ahora MailerSend rechazará los envíos a su dirección.',
		action:
			'Respeta la decisión. Si necesitas contactarlo, hazlo por otro medio (llamada o WhatsApp).',
	},
	{
		kind: 'interaction',
		code: 'complained',
		label: 'Queja de spam',
		severity: 'danger',
		summary: 'El destinatario marcó este correo como spam.',
		meaning:
			'El destinatario reportó este correo como spam desde su proveedor. MailerSend suprimirá esa dirección para evitar más quejas.',
		action:
			'Revisa el contenido del asunto y del mensaje. No reenvíes a esa dirección; contáctalo por otro medio.',
	},
	{
		kind: 'interaction',
		code: 'no_interaction',
		label: 'Sin interacción',
		severity: 'secondary',
		summary: 'Se entregó, pero no se abrió ni se hizo clic.',
		meaning:
			'El correo fue entregado y todavía no hay registro de que se haya abierto o de que se haya hecho clic en él.',
		action: 'No requiere acción. Puede que aún no lo haya leído o que su cliente bloquee el seguimiento.',
	},
	// #endregion
];

const BY_KEY = new Map(DETAILS.map((d) => [`${d.kind}:${d.code}`, d]));

export const SUPPRESSION_DETAILS = DETAILS.filter((d) => d.kind === 'suppression');
export const INTERACTION_DETAILS = DETAILS.filter((d) => d.kind === 'interaction');

/** Significado del valor; para uno desconocido (MailerSend puede sumar valores) devuelve una ficha genérica. */
export function detailInfo(kind: DetailKind, code: string): DetailInfo {
	return (
		BY_KEY.get(`${kind}:${code}`) ?? {
			kind,
			code,
			label: code,
			severity: 'secondary',
			summary: 'Valor sin descripción registrada.',
			meaning:
				'MailerSend devolvió un valor que esta vista todavía no documenta. Consulta la documentación de MailerSend para su significado.',
			action: 'Si aparece seguido, avisa al equipo de sistemas para documentarlo aquí.',
		}
	);
}

/** Estados del email (columna «Estado»), para la leyenda. */
export const ESTADO_LEGEND: { code: string; label: string; summary: string }[] = [
	{ code: 'queued', label: 'En cola', summary: 'MailerSend lo aceptó y aún no lo envió.' },
	{ code: 'sent', label: 'Enviado', summary: 'MailerSend lo entregó al servidor del destinatario.' },
	{ code: 'delivered', label: 'Entregado', summary: 'El servidor del destinatario confirmó la entrega.' },
	{ code: 'rejected', label: 'Rechazado', summary: 'MailerSend no lo envió: el motivo está en «Detalle».' },
];
