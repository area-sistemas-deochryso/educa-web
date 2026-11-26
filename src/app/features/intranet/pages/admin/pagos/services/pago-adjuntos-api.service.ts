// #region Imports
import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '@config/environment';
import type { PagoAdjunto } from '@data/models';
// #endregion

export interface PagoAdjuntoArchivo {
	blob: Blob;
	fileName: string;
}

/** El error se muestra en línea por `errorCode`/status, no como toast global; los 5xx y status 0 se siguen reportando. */
const SIN_TOAST = { headers: new HttpHeaders({ 'X-Skip-Error-Toast': 'true' }) };

/**
 * Cliente de `/api/pagos/{id}/adjuntos` (voucher del pago, `INV-PG16`; contrato en `educa-coord/contracts/api-catalog.md`).
 * Requiere conexión: no pasa por el WAL ni se encola (un archivo no se reaplica con seguridad desde una cola).
 * El archivo se baja por el propio API (nunca una URL pública) y el servidor lo marca `no-store`.
 */
@Injectable({ providedIn: 'root' })
export class PagoAdjuntosApiService {
	private readonly http = inject(HttpClient);
	private readonly apiUrl = `${environment.apiUrl}/api/pagos`;

	/** Adjuntos del pago, activos y dados de baja (con su rastro). */
	listar(pagoId: number): Observable<PagoAdjunto[]> {
		return this.http.get<PagoAdjunto[]>(`${this.apiUrl}/${pagoId}/adjuntos`, SIN_TOAST);
	}

	/** Sube un voucher (`multipart/form-data`, campo `archivo`). */
	subir(pagoId: number, archivo: File): Observable<PagoAdjunto> {
		const cuerpo = new FormData();
		cuerpo.append('archivo', archivo, archivo.name);
		return this.http.post<PagoAdjunto>(`${this.apiUrl}/${pagoId}/adjuntos`, cuerpo, SIN_TOAST);
	}

	/** Stream del blob privado. Un adjunto dado de baja no se entrega (400). */
	descargar(pagoId: number, adjuntoId: number, nombreOriginal: string): Observable<PagoAdjuntoArchivo> {
		return this.http
			.get(`${this.apiUrl}/${pagoId}/adjuntos/${adjuntoId}`, { responseType: 'blob', observe: 'response', ...SIN_TOAST })
			.pipe(map((res) => ({ blob: res.body as Blob, fileName: this.fileNameOf(res, nombreOriginal) })));
	}

	/** Baja con usuario, fecha y motivo; no borra el archivo. */
	darDeBaja(pagoId: number, adjuntoId: number, motivo: string): Observable<unknown> {
		return this.http.post(`${this.apiUrl}/${pagoId}/adjuntos/${adjuntoId}/baja`, { motivo }, SIN_TOAST);
	}

	private fileNameOf(res: HttpResponse<Blob>, fallback: string): string {
		const header = res.headers.get('Content-Disposition') ?? '';
		const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(header)?.[1];
		const plain = /filename="?([^";]+)"?/i.exec(header)?.[1];
		return decodeURIComponent(utf8 ?? plain ?? fallback);
	}
}
