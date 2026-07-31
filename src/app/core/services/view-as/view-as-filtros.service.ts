// #region Imports
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '@config/environment';
// #endregion

// #region Models
export interface ViewAsFiltroOption {
	value: number;
	label: string;
}

interface SalonListDto {
	salonId: number;
	nombreSalon: string;
	anio: number;
}

interface CursoListaDto {
	id: number;
	nombre: string;
}
// #endregion

// #region Implementation
/**
 * Catálogo mínimo de salones y cursos para los filtros del picker "ver como" (xrepo-93).
 * No reusa los servicios de `pages/admin/schedules` a propósito: `ViewAsPickerComponent`
 * es un componente compartido cargado para todo rol (vía `ViewAsBannerComponent` en el
 * layout), y acoplarlo a una feature admin-only rompería el boundary que
 * `admin-no-cross-feature`/`profesor-no-cross-feature` ya protegen para el resto del código.
 */
@Injectable({ providedIn: 'root' })
export class ViewAsFiltrosService {
	private readonly http = inject(HttpClient);

	listarSalones(): Observable<ViewAsFiltroOption[]> {
		return this.http
			.get<SalonListDto[]>(`${environment.apiUrl}/api/sistema/salones/listar`)
			.pipe(map((salones) => salones.map((s) => ({ value: s.salonId, label: `${s.nombreSalon} - ${s.anio}` }))));
	}

	listarCursos(): Observable<ViewAsFiltroOption[]> {
		return this.http
			.get<CursoListaDto[]>(`${environment.apiUrl}/api/sistema/cursos/listar`)
			.pipe(map((cursos) => cursos.map((c) => ({ value: c.id, label: c.nombre }))));
	}
}
// #endregion
