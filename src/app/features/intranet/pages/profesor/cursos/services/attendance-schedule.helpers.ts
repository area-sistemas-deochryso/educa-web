// #region Off-schedule date
/**
 * `true` si `fecha` (`yyyy-mm-dd`) no cae en el día de semana del horario del curso
 * (0=domingo…6=sábado, igual que `Date.getDay`). Sin día esperado no hay fecha atípica.
 * Misma regla que `AttendanceRegistrationPanelComponent.fechaFueraDeHorario`, pero sobre
 * la fecha de la lista cargada y no sobre el datepicker.
 */
export function isOffScheduleDate(fecha: string, diaSemanaEsperado: number | null): boolean {
	if (diaSemanaEsperado === null) return false;
	const [year, month, day] = fecha.split('-').map(Number);
	return new Date(year, month - 1, day).getDay() !== diaSemanaEsperado;
}
// #endregion
