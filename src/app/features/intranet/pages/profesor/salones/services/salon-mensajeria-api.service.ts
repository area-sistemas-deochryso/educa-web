import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@config/environment';
import {
	ConversacionListDto,
	ConversacionDetalleDto,
	CrearConversacionDto,
	CrearConversacionResponseDto,
	EnviarMensajeDto,
	EnviarMensajeResponseDto,
	DestinatariosDisponiblesDto,
} from '../../models';

@Injectable({ providedIn: 'root' })
export class SalonMensajeriaApiService {
	private readonly http = inject(HttpClient);
	private readonly baseUrl = `${environment.apiUrl}/api/conversaciones`;

	// #region Consultas (GET)
	listarConversaciones(horarioId?: number): Observable<ConversacionListDto[]> {
		const params = horarioId ? `?horarioId=${horarioId}` : '';
		return this.http.get<ConversacionListDto[]>(`${this.baseUrl}/listar${params}`);
	}

	obtenerConversacion(id: number): Observable<ConversacionDetalleDto> {
		return this.http.get<ConversacionDetalleDto>(`${this.baseUrl}/${id}`);
	}

	getDestinatarios(): Observable<DestinatariosDisponiblesDto> {
		return this.http.get<DestinatariosDisponiblesDto>(`${this.baseUrl}/destinatarios`);
	}
	// #endregion

	// #region Comandos (POST/PUT)
	crearConversacion(dto: CrearConversacionDto): Observable<CrearConversacionResponseDto> {
		return this.http.post<CrearConversacionResponseDto>(`${this.baseUrl}/crear`, dto);
	}

	enviarMensaje(dto: EnviarMensajeDto): Observable<EnviarMensajeResponseDto> {
		return this.http.post<EnviarMensajeResponseDto>(`${this.baseUrl}/mensaje`, dto);
	}

	marcarLeido(id: number): Observable<void> {
		return this.http.put<void>(`${this.baseUrl}/${id}/leido`, {});
	}
	// #endregion
}
