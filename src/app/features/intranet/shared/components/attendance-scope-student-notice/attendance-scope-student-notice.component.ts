// #region Imports
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
// #endregion

/**
 * Plan 27 · INV-C11 — Mensaje por-alumno cuando el estudiante consultado tiene
 * `GRA_Orden < 8` (fuera del alcance de asistencia biométrica diaria).
 *
 * Reemplaza el listado de asistencias en:
 * - `/intranet/mi-asistencia` (estudiante)
 * - `/intranet/mis-hijos-asistencia` (apoderado, por-hijo)
 *
 * Design system §9 — banner con `color-mix()`, texto `--text-color`.
 * a11y — `role="note"` + icono con `aria-hidden="true"`.
 */
@Component({
	selector: 'app-attendance-scope-student-notice',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './attendance-scope-student-notice.component.html',
	styleUrl: './attendance-scope-student-notice.component.scss',
})
export class AttendanceScopeStudentNoticeComponent {
	/** Nombre del estudiante/hijo para personalizar el mensaje. Opcional. */
	readonly nombre = input<string | null>(null);
}
