import { Observable } from 'rxjs';

import { AsistenciaAsistenteAdminDto, EstadisticasAsistenciaDia } from '@data/models';

// #region Implementation
export interface AttendanceDirectorDiaResult {
	personas: AsistenciaAsistenteAdminDto[];
	estadisticas: EstadisticasAsistenciaDia;
}

// * Permite reusar AttendanceDirectorStaffComponent con fuentes de datos que no pasan
//   por AsistenciaStaffApiService (ej. asistentes-admin, backend/endpoint distinto).
export interface AttendanceDirectorPersonaLoader {
	dia(fecha: Date): Observable<AttendanceDirectorDiaResult>;
	mes(fechaInicio: Date, fechaFin: Date): Observable<AsistenciaAsistenteAdminDto[]>;
}
// #endregion
