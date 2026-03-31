import { inject, Injectable } from '@angular/core';

import { ErrorHandlerService } from '@core/services';
import {
  UI_ADMIN_ERROR_DETAILS,
  UI_SUMMARIES,
} from '@app/shared/constants';
import { HorariosStore } from './horarios.store';

/**
 * UI facade: dialog/drawer visibility, form state, wizard steps, curso dialog.
 * Shares HorariosStore with sibling facades.
 */
@Injectable({ providedIn: 'root' })
export class HorariosUiFacade {
  private store = inject(HorariosStore);
  private errorHandler = inject(ErrorHandlerService);

  // #region Exponer estado del store
  readonly vm = this.store.vm;

  // #endregion
  // #region Comandos de dialog

  /**
   * Abrir dialog para crear nuevo horario
   */
  openNewDialog(): void {
    this.store.clearFormData();
    this.store.setEditingId(null);
    this.store.resetWizard();
    this.store.openDialog();
  }

  /**
   * Abrir dialog para editar horario existente
   */
  openEditDialog(id: number): void {
    const horario = this.store.horarios().find((h) => h.id === id);
    if (!horario) {
      this.errorHandler.showError(UI_SUMMARIES.error, UI_ADMIN_ERROR_DETAILS.horarioNotFound);
      return;
    }

    this.store.setFormData({
      diaSemana: horario.diaSemana,
      horaInicio: horario.horaInicio,
      horaFin: horario.horaFin,
      salonId: horario.salonId,
      cursoId: horario.cursoId,
      profesorId: horario.profesorId,
      estudianteIds: null,
    });
    this.store.setEditingId(id);
    this.store.resetWizard();
    this.store.openDialog();
  }

  /**
   * Cerrar dialog y limpiar formulario
   */
  closeDialog(): void {
    this.store.closeDialog();
  }

  // #endregion
  // #region Comandos de curso dialog

  /**
   * Abrir modal de selección de cursos por nivel
   */
  openCursoDialog(): void {
    this.store.openCursoDialog();
  }

  /**
   * Cerrar modal de selección de cursos
   */
  closeCursoDialog(): void {
    this.store.closeCursoDialog();
  }

  /**
   * Seleccionar un curso desde el modal
   */
  selectCurso(cursoId: number): void {
    this.store.setFormData({ cursoId });
    this.store.closeCursoDialog();
  }

  // #endregion
  // #region Comandos de import dialog

  openImportDialog(): void {
    this.store.openImportDialog();
  }

  closeImportDialog(): void {
    this.store.closeImportDialog();
  }

  // #endregion
  // #region Comandos de detail drawer

  /**
   * Cerrar drawer de detalle
   */
  closeDetailDrawer(): void {
    this.store.closeDetailDrawer();
  }

  // #endregion
  // #region Comandos de wizard

  /**
   * Avanzar en el wizard
   */
  nextWizardStep(): void {
    this.store.nextStep();
  }

  /**
   * Retroceder en el wizard
   */
  prevWizardStep(): void {
    this.store.prevStep();
  }

  // #endregion
}
