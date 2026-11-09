// #region Imports
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '@config/environment';
import type {
	EstudianteBusqueda,
	MiembroFamilia,
	PagoCorte,
	PanelCobranza,
	QuienesDeben,
	QuienesDebenFiltros,
	RegistrarPagoPayload,
	RepartoPropuesto,
} from '@data/models';
// #endregion

export interface PagosArchivo {
	blob: Blob;
	fileName: string;
}

/**
 * Cliente de `/api/pagos` (reportes de cobranza). Las respuestas `ApiResponse<T>` las desenvuelve el interceptor.
 * Los reportes llevan la política de rate limiting `reports`: quien llama debe aplicar debounce y no reintentar 4xx/429.
 */
@Injectable({ providedIn: 'root' })
export class PagosApiService {
	private readonly http = inject(HttpClient);
	private readonly apiUrl = `${environment.apiUrl}/api/pagos`;

	/** Foto de cobranza a una fecha; sin `fecha` es «hoy». */
	panel(fecha?: string | null): Observable<PanelCobranza> {
		return this.http.get<PanelCobranza>(`${this.apiUrl}/panel`, { params: this.params({ fecha }) });
	}

	deben(filtros: QuienesDebenFiltros): Observable<QuienesDeben> {
		return this.http.get<QuienesDeben>(`${this.apiUrl}/deben`, { params: this.debenParams(filtros) });
	}

	/** Mismos filtros que la pantalla, sin paginar; el nombre del archivo viene del servidor. */
	debenExcel(filtros: QuienesDebenFiltros): Observable<PagosArchivo> {
		const { page: _page, pageSize: _pageSize, ...sinPaginar } = filtros;
		return this.http
			.get(`${this.apiUrl}/deben/excel`, {
				params: this.debenParams(sinPaginar),
				responseType: 'blob',
				observe: 'response',
			})
			.pipe(map((res) => ({ blob: res.body as Blob, fileName: this.fileNameOf(res) })));
	}

	cortes(anio: number): Observable<PagoCorte[]> {
		return this.http.get<PagoCorte[]>(`${this.apiUrl}/cortes`, { params: this.params({ anio }) });
	}

	guardarCorte(corte: PagoCorte): Observable<PagoCorte> {
		return this.http.put<PagoCorte>(`${this.apiUrl}/cortes`, corte);
	}

	// #region Registrar pago
	/** Propone el reparto entre los alumnos indicados. No persiste nada. */
	proponerReparto(monto: number, fechaPago: string, estudianteIds: number[]): Observable<RepartoPropuesto> {
		return this.http.post<RepartoPropuesto>(`${this.apiUrl}/reparto/proponer`, { monto, fechaPago, estudianteIds });
	}

	/** Alumnos activos por nombre o DNI completo, sin exigir deuda. El servidor pide al menos 2 caracteres. */
	buscarEstudiantes(buscar: string, limite = 20): Observable<EstudianteBusqueda[]> {
		return this.http.get<EstudianteBusqueda[]>(`${this.apiUrl}/estudiantes`, {
			params: this.params({ buscar: buscar.trim(), limite }),
		});
	}

	/** Grupo familiar por correo de apoderado. Sin correo, devuelve solo el alumno. */
	familia(estudianteId: number): Observable<MiembroFamilia[]> {
		return this.http.get<MiembroFamilia[]>(`${this.apiUrl}/estudiantes/${estudianteId}/familia`);
	}

	/** Registra el pago. La clave de idempotencia la decide el llamador (un intento = una clave). */
	registrarPago(payload: RegistrarPagoPayload, claveIdempotencia: string): Observable<{ id: number }> {
		return this.http.post<{ id: number }>(this.apiUrl, payload, {
			headers: { 'X-Idempotency-Key': claveIdempotencia },
		});
	}
	// #endregion

	// #region Helpers
	private debenParams(f: QuienesDebenFiltros): HttpParams {
		return this.params({
			fecha: f.fecha,
			buscar: f.buscar?.trim(),
			salonId: f.salonId,
			orden: f.orden,
			descendente: f.orden ? f.descendente : undefined,
			page: f.page,
			pageSize: f.pageSize,
		});
	}

	private params(values: Record<string, string | number | boolean | null | undefined>): HttpParams {
		let params = new HttpParams();
		for (const [key, value] of Object.entries(values)) {
			if (value === null || value === undefined || value === '') continue;
			params = params.set(key, String(value));
		}
		return params;
	}

	private fileNameOf(res: HttpResponse<Blob>): string {
		const header = res.headers.get('Content-Disposition') ?? '';
		const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(header)?.[1];
		const plain = /filename="?([^";]+)"?/i.exec(header)?.[1];
		return decodeURIComponent(utf8 ?? plain ?? 'Quienes_Deben.xlsx');
	}
	// #endregion
}
