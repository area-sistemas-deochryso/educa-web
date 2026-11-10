// #region Imports
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '@config/environment';
import type {
	ConfirmarSinDatoPayload,
	EstadoCuenta,
	EstudianteBusqueda,
	FiltroSinDato,
	GenerarCargosPayload,
	GuardarParametroAnioPayload,
	MiembroFamilia,
	PagoCorte,
	ParametroAnio,
	PanelCobranza,
	QuienesDeben,
	QuienesDebenFiltros,
	RegistrarAjustePayload,
	RegistrarPagoPayload,
	RepartoPropuesto,
	ResultadoConfirmacion,
	ResultadoGeneracion,
	SinDato,
	SinDatoFiltros,
	VistaPreviaConfirmacion,
	VistaPreviaGeneracion,
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

	/** Cuenta completa del alumno a hoy (cargos, pagos y ajustes, incluidos los anulados). */
	estadoCuenta(estudianteId: number): Observable<EstadoCuenta> {
		return this.http.get<EstadoCuenta>(`${this.apiUrl}/estudiantes/${estudianteId}/estado-cuenta`);
	}

	/** Cargos «sin dato» agrupados por alumno. Política `reports`: el llamador aplica debounce. */
	sinDato(filtros: SinDatoFiltros): Observable<SinDato> {
		return this.http.get<SinDato>(`${this.apiUrl}/sin-dato`, {
			params: this.params({
				buscar: filtros.buscar?.trim(),
				salonId: filtros.salonId,
				page: filtros.page,
				pageSize: filtros.pageSize,
			}),
		});
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

	// #region Acciones sobre la cuenta
	/** Anula un pago con motivo. Libera el recargo que ese pago congeló. */
	anularPago(pagoId: number, motivo: string): Observable<unknown> {
		return this.http.post(`${this.apiUrl}/${pagoId}/anular`, { motivo });
	}

	registrarAjuste(payload: RegistrarAjustePayload): Observable<{ id: number }> {
		return this.http.post<{ id: number }>(`${this.apiUrl}/ajustes`, payload);
	}

	anularAjuste(ajusteId: number, motivo: string): Observable<unknown> {
		return this.http.post(`${this.apiUrl}/ajustes/${ajusteId}/anular`, { motivo });
	}
	// #endregion

	// #region Carga inicial (F6a)
	/** Parámetros del año. `404 PAGO_PARAMETRO_ANIO_INEXISTENTE` si todavía no existen. */
	parametrosAnio(anio: number): Observable<ParametroAnio> {
		return this.http.get<ParametroAnio>(`${this.apiUrl}/parametros/${anio}`);
	}

	/** Crea o edita los parámetros del año; `rowVersion` nulo solo al crear. */
	guardarParametrosAnio(payload: GuardarParametroAnioPayload): Observable<ParametroAnio> {
		return this.http.put<ParametroAnio>(`${this.apiUrl}/parametros`, payload);
	}

	/** Cuántos cargos nacerían y cuántos se omiten. No escribe. */
	vistaPreviaGeneracion(payload: GenerarCargosPayload): Observable<VistaPreviaGeneracion> {
		return this.http.post<VistaPreviaGeneracion>(`${this.apiUrl}/cargos/generar/vista-previa`, payload);
	}

	/** Genera los cargos (idempotente). `crearEsperados` es el `aCrear` de la vista previa; si ya no coincide, `409`. */
	generarCargos(payload: GenerarCargosPayload, crearEsperados: number): Observable<ResultadoGeneracion> {
		return this.http.post<ResultadoGeneracion>(`${this.apiUrl}/cargos/generar`, { ...payload, crearEsperados });
	}

	vistaPreviaConfirmacion(filtro: FiltroSinDato): Observable<VistaPreviaConfirmacion> {
		return this.http.post<VistaPreviaConfirmacion>(`${this.apiUrl}/cargos/sin-dato/vista-previa`, filtro);
	}

	/** Confirma en bloque lo «sin dato». `cargosEsperados` es el conteo de la vista previa; si ya no coincide, `409`. */
	confirmarSinDato(payload: ConfirmarSinDatoPayload): Observable<ResultadoConfirmacion> {
		return this.http.post<ResultadoConfirmacion>(`${this.apiUrl}/cargos/sin-dato/confirmar`, payload);
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
