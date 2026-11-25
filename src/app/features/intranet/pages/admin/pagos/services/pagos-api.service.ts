// #region Imports
import { HttpClient, HttpHeaders, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '@config/environment';
import type {
	ConfiguracionAnio,
	ConfirmarImportacionPayload,
	CargosSinMatricula,
	ConfirmarSinDatoPayload,
	ConsistenciaFiltros,
	EstadoCuenta,
	EstudianteBusqueda,
	FiltroSinDato,
	GenerarCargosAlumnoPayload,
	GenerarCargosPayload,
	GuardarCronogramaAnioPayload,
	GuardarMontosAnioPayload,
	GuardarParametroAnioPayload,
	ImportacionPayload,
	MatriculadosSinCargo,
	MatriculaSinCargo,
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
	ResultadoImportacion,
	ResultadoGeneracion,
	SinDato,
	SinDatoFiltros,
	VistaPreviaConfirmacion,
	VistaPreviaGeneracion,
	VistaPreviaImportacion,
} from '@data/models';
// #endregion

export interface PagosArchivo {
	blob: Blob;
	fileName: string;
}

/**
 * Las pantallas de «Configurar año» muestran el error en línea por `errorCode`; el toast global repetiría el texto
 * crudo del servidor. Los 5xx y los status 0 se siguen reportando.
 */
const SIN_TOAST = { headers: new HttpHeaders({ 'X-Skip-Error-Toast': 'true' }) };

/**
 * Cliente de `/api/pagos` (reportes de cobranza). Las respuestas `ApiResponse<T>` las desenvuelve el interceptor.
 * Los reportes llevan la política de rate limiting `reports`: quien llama debe aplicar debounce y no reintentar 4xx/429.
 * Pagos no se cachea en el SW (INV-WAL-RES11): cada GET va a la red, también la relectura después de un `409`.
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

	// #region Consistencia matrícula ↔ cobro (P123 F5)
	/** Matriculados activos del año sin ningún cargo vigente. Política `reports`: el llamador aplica debounce. */
	matriculadosSinCargo(filtros: ConsistenciaFiltros): Observable<MatriculadosSinCargo> {
		return this.http.get<MatriculadosSinCargo>(`${this.apiUrl}/consistencia/matriculados-sin-cargo`, {
			params: this.params({
				anio: filtros.anio,
				buscar: filtros.buscar?.trim(),
				salonId: filtros.salonId,
				page: filtros.page,
				pageSize: filtros.pageSize,
			}),
		});
	}

	/** Cargos vigentes del año de alumnos sin matrícula activa, por alumno. Sin filtro de salón. */
	cargosSinMatricula(filtros: ConsistenciaFiltros): Observable<CargosSinMatricula> {
		return this.http.get<CargosSinMatricula>(`${this.apiUrl}/consistencia/cargos-sin-matricula`, {
			params: this.params({
				anio: filtros.anio,
				buscar: filtros.buscar?.trim(),
				page: filtros.page,
				pageSize: filtros.pageSize,
			}),
		});
	}
	// #endregion

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

	/**
	 * Registra el pago. La clave de idempotencia la decide el llamador (un intento = una clave).
	 * Sin toast global: el error se muestra una sola vez, en línea, con el texto por `errorCode` (no el del servidor,
	 * que cita la `INV-PG..`). Los 5xx y los status 0 se siguen reportando.
	 */
	registrarPago(payload: RegistrarPagoPayload, claveIdempotencia: string): Observable<{ id: number }> {
		return this.http.post<{ id: number }>(this.apiUrl, payload, {
			headers: SIN_TOAST.headers.set('X-Idempotency-Key', claveIdempotencia),
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
		return this.http.get<ParametroAnio>(`${this.apiUrl}/parametros/${anio}`, SIN_TOAST);
	}

	/** Crea o edita los parámetros del año; `rowVersion` nulo solo al crear. */
	guardarParametrosAnio(payload: GuardarParametroAnioPayload): Observable<ParametroAnio> {
		return this.http.put<ParametroAnio>(`${this.apiUrl}/parametros`, payload, SIN_TOAST);
	}

	/** Cuántos cargos nacerían y cuántos se omiten. No escribe. */
	vistaPreviaGeneracion(payload: GenerarCargosPayload): Observable<VistaPreviaGeneracion> {
		return this.http.post<VistaPreviaGeneracion>(`${this.apiUrl}/cargos/generar/vista-previa`, payload);
	}

	/** Genera los cargos (idempotente). `crearEsperados` es el `aCrear` de la vista previa; si ya no coincide, `409`. */
	generarCargos(payload: GenerarCargosPayload, crearEsperados: number): Observable<ResultadoGeneracion> {
		return this.http.post<ResultadoGeneracion>(`${this.apiUrl}/cargos/generar`, { ...payload, crearEsperados });
	}

	/** Cargos de un alumno concreto al matricularlo (P123 F7). No escribe; responde el motivo en `omitidos[]` en vez de lanzar. */
	vistaPreviaGeneracionAlumno(payload: GenerarCargosAlumnoPayload): Observable<VistaPreviaGeneracion> {
		return this.http.post<VistaPreviaGeneracion>(`${this.apiUrl}/cargos/generar/alumno/vista-previa`, payload, SIN_TOAST);
	}

	/** Genera matrícula (e inscripción si es nuevo) de un alumno. Idempotente: repetir da `creados: 0`. */
	generarCargosAlumno(payload: GenerarCargosAlumnoPayload, crearEsperados: number): Observable<ResultadoGeneracion> {
		return this.http.post<ResultadoGeneracion>(`${this.apiUrl}/cargos/generar/alumno`, { ...payload, crearEsperados }, SIN_TOAST);
	}

	/** Aviso suave: ¿matriculado en un salón del año sin cargo de matrícula? Sin `anio`, el de hoy. */
	matriculaSinCargo(estudianteId: number, anio?: number | null): Observable<MatriculaSinCargo> {
		return this.http.get<MatriculaSinCargo>(`${this.apiUrl}/estudiantes/${estudianteId}/matricula-sin-cargo`, {
			...SIN_TOAST,
			params: this.params({ anio }),
		});
	}

	vistaPreviaConfirmacion(filtro: FiltroSinDato): Observable<VistaPreviaConfirmacion> {
		return this.http.post<VistaPreviaConfirmacion>(`${this.apiUrl}/cargos/sin-dato/vista-previa`, filtro);
	}

	/** Confirma en bloque lo «sin dato». `cargosEsperados` es el conteo de la vista previa; si ya no coincide, `409`. */
	confirmarSinDato(payload: ConfirmarSinDatoPayload): Observable<ResultadoConfirmacion> {
		return this.http.post<ResultadoConfirmacion>(`${this.apiUrl}/cargos/sin-dato/confirmar`, payload);
	}
	// #endregion

	// #region Configuración del año (P123 F2)
	/** Conceptos activos con sus montos y el cronograma del año. Un año sin datos responde vacío, no `404`. */
	configuracionAnio(anio: number): Observable<ConfiguracionAnio> {
		return this.http.get<ConfiguracionAnio>(`${this.apiUrl}/configuracion/${anio}`, SIN_TOAST);
	}

	/** Upsert de los montos enviados (no borra; todo o nada, INV-PG06). `rowVersion` nulo solo al crear (INV-S05). */
	guardarMontosAnio(payload: GuardarMontosAnioPayload): Observable<ConfiguracionAnio> {
		return this.http.put<ConfiguracionAnio>(`${this.apiUrl}/configuracion/montos`, payload, SIN_TOAST);
	}

	/** Reemplaza las 10 cuotas del año (todo o nada, INV-PG05). */
	guardarCronogramaAnio(payload: GuardarCronogramaAnioPayload): Observable<ConfiguracionAnio> {
		return this.http.put<ConfiguracionAnio>(`${this.apiUrl}/configuracion/cronograma`, payload, SIN_TOAST);
	}
	// #endregion

	// #region Importación (F6c)
	/** Evalúa cada fila sin escribir. Política `reports`: hasta 3000 filas por vez, sin reintentos. */
	vistaPreviaImportacion(payload: ImportacionPayload): Observable<VistaPreviaImportacion> {
		return this.http.post<VistaPreviaImportacion>(`${this.apiUrl}/importacion/vista-previa`, payload);
	}

	/** Aplica las filas (saldos, descuentos y pagos). `filasEsperadas` es el `aplicables` de la vista previa; si ya no coincide, `409`. */
	confirmarImportacion(payload: ConfirmarImportacionPayload): Observable<ResultadoImportacion> {
		return this.http.post<ResultadoImportacion>(`${this.apiUrl}/importacion/confirmar`, payload);
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
