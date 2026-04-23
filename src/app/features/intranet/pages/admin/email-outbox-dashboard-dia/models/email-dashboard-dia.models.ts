// #region DTOs (mirror del BE — Plan 30 Chat 1 F1.BE)

export interface EmailDashboardDiaDto {
	fecha: string;
	resumen: EmailDashboardResumen;
	porHora: EmailDashboardPorHora[];
	porTipo: EmailDashboardPorTipo[];
	bouncesAcumulados: EmailBouncesAcumulados[];
	generatedAt: string;
}

export interface EmailDashboardResumen {
	enviados: number;
	fallidos: number;
	pendientes: number;
	reintentando: number;
	formatoInvalido: number;
	sinCorreo: number;
	blacklisteados: number;
	throttleHost: number;
	otrosFallos: number;
	deferFailContadorCpanel: number;
}

export interface EmailDashboardPorHora {
	hora: number;
	enviados: number;
	fallidos: number;
	queLlegaronAlSmtp: number;
}

export interface EmailDashboardPorTipo {
	tipo: string;
	enviados: number;
	fallidos: number;
	pendientes: number;
}

export interface EmailBouncesAcumulados {
	destinatarioMasked: string;
	bouncesAcumulados: number;
	ultimoIntento: string;
	ultimoError: string;
}

// #endregion

// #region Error codes del BE (400)
export type DashboardDiaErrorCode =
	| 'FECHA_FORMATO_INVALIDO'
	| 'FECHA_FUTURA_INVALIDA'
	| 'FECHA_DEMASIADO_ANTIGUA';
// #endregion
