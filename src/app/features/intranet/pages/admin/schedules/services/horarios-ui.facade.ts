import { inject, Injectable } from '@angular/core';

import { ErrorHandlerService } from '@core/services';
import {
  UI_ADMIN_ERROR_DETAILS,
  UI_SUMMARIES,
} from '@app/shared/constants';
import { SchedulesStore } from './horarios.store';

/**
 * UI facade: dialog/drawer visibility, form state, wizard steps, curso dialog.
 * Shares SchedulesStore with sibling facades.
 */
@Injectable({ providedIn: 'root' })
export class SchedulesUiFacade {
  private store = inject(SchedulesStore);
  private errorHandler = inject(ErrorHandlerService);

  // #region Exponer estado del store
  readonly vm = this.store.vm;

  // #endregion
  // #region Comandos de dialog

  /**
   * Abrir dialog para crear nuevo horario
   */
  openNewDialog(): void {
    this.store.formStore.clearFormData();
    this.store.formStore.setEditingId(null);
    this.store.formStore.resetWizard();
    this.store.formStore.openDialog();
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

    this.store.formStore.setFormData({
      diaSemana: horario.diaSemana,
      horaInicio: horario.horaInicio,
      horaFin: horario.horaFin,
      salonId: horario.salonId,
      cursoId: horario.cursoId,
      profesorId: horario.profesorId,
      estudianteIds: null,
    });
    this.store.formStore.setEditingId(id);
    this.store.formStore.resetWizard();
    this.store.formStore.openDialog();
  }

  /**
   * Cerrar dialog y limpiar formulario
   */
  closeDialog(): void {
    this.store.formStore.closeDialog();
  }

  // #endregion
  // #region Comandos de curso dialog

  /**
   * Abrir modal de selección de cursos por nivel
   */
  openCursoDialog(): void {
    this.store.formStore.openCursoDialog();
  }

  /**
   * Cerrar modal de selección de cursos
   */
  closeCursoDialog(): void {
    this.store.formStore.closeCursoDialog();
  }

  /**
   * Seleccionar un curso desde el modal
   */
  selectCurso(cursoId: number): void {
    this.store.formStore.setFormData({ cursoId });
    this.store.formStore.closeCursoDialog();
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
    this.store.formStore.nextStep();
  }

  /**
   * Retroceder en el wizard
   */
  prevWizardStep(): void {
    this.store.formStore.prevStep();
  }

  // #endregion
}
