import { AsistenciaDetalle, HijoApoderado, ResumenAsistencia } from '@core/services';
import { Injectable, inject } from '@angular/core';

import { BaseAdapter } from '../base/base.adapter';

/**
 * Modelo de vista para una asistencia
 */
export interface AsistenciaView {
	id: number;
	fecha: Date;
	sede: string;
	entrada: string | null;
	salida: string | null;
	estadoIngreso: 'temprano' | 'puntual' | 'tarde' | 'ausente';
	estadoSalida: 'normal' | 'temprano' | 'tarde' | 'ausente';
	completa: boolean;
	observacion: string | null;
}

/**
 * Modelo de vista para el resumen de asistencias
 */
export interface ResumenView {
	totalDias: number;
	asistidos: number;
	faltas: number;
	tardanzas: number;
	porcentaje: number;
	porcentajeFormateado: string;
	asistencias: AsistenciaView[];
}

/**
 * Modelo de vista para un hijo/estudiante
 */
export interface HijoView {
	id: number;
	dni: string;
	nombre: string;
	grado: string;
	seccion: string;
	gradoSeccion: string;
	relacion: string;
}

/**
 * Adapter para transformar AsistenciaDetalle del API a AsistenciaView
 */
@Injectable({
	providedIn: 'root',
})
export class AsistenciaAdapter extends BaseAdapter<AsistenciaDetalle, AsistenciaView> {
	// * Converts API asistencia details into UI-friendly view models.
	adapt(source: AsistenciaDetalle): AsistenciaView {
		return {
			id: source.asistenciaId,
			fecha: new Date(source.fecha),
			sede: source.sede,
			entrada: source.horaEntrada ? this.formatHora(source.horaEntrada) : null,
			salida: source.horaSalida ? this.formatHora(source.horaSalida) : null,
			estadoIngreso: this.getEstadoIngreso(source.horaEntrada),
			estadoSalida: this.getEstadoSalida(source.horaSalida),
			completa: source.estado === 'Completa',
			observacion: source.observacion,
		};
	}

	private formatHora(fechaHora: string): string {
		const date = new Date(fechaHora);
		return date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
	}

	private getEstadoIngreso(horaEntrada: string | null): AsistenciaView['estadoIngreso'] {
		if (!horaEntrada) return 'ausente';

		const fecha = new Date(horaEntrada);
		const hora = fecha.getHours();
		const minutos = fecha.getMinutes();

		if (hora < 7 || (hora === 7 && minutos < 30)) {
			return 'temprano';
		} else if (hora === 7 || (hora === 8 && minutos === 0)) {
			return 'puntual';
		}
		return 'tarde';
	}

	private getEstadoSalida(horaSalida: string | null): AsistenciaView['estadoSalida'] {
		if (!horaSalida) return 'ausente';

		const fecha = new Date(horaSalida);
		const hora = fecha.getHours();
		const minutos = fecha.getMinutes();

		if (hora > 14 || (hora === 14 && minutos >= 30)) {
			return 'normal';
		} else if (hora === 14) {
			return 'temprano';
		}
		return 'tarde';
	}
}

/**
 * Adapter para transformar ResumenAsistencia del API a ResumenView
 */
@Injectable({
	providedIn: 'root',
})
export class ResumenAsistenciaAdapter extends BaseAdapter<ResumenAsistencia, ResumenView> {
	private asistenciaAdapter = inject(AsistenciaAdapter);
	constructor() {
		super();
	}

	adapt(source: ResumenAsistencia): ResumenView {
		return {
			totalDias: source.totalDias,
			asistidos: source.diasAsistidos,
			faltas: source.faltas,
			tardanzas: source.tardanzas,
			porcentaje: source.porcentajeAsistencia,
			porcentajeFormateado: `${source.porcentajeAsistencia.toFixed(1)}%`,
			asistencias: this.asistenciaAdapter.adaptList(source.detalle),
		};
	}
}

/**
 * Adapter para transformar HijoApoderado del API a HijoView
 */
@Injectable({
	providedIn: 'root',
})
export class HijoAdapter extends BaseAdapter<HijoApoderado, HijoView> {
	adapt(source: HijoApoderado): HijoView {
		return {
			id: source.estudianteId,
			dni: source.dni,
			nombre: source.nombreCompleto,
			grado: source.grado,
			seccion: source.seccion,
			gradoSeccion: `${source.grado} - ${source.seccion}`,
			relacion: source.relacion,
		};
	}
}
