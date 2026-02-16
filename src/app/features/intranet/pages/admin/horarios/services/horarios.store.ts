import { computed, inject, Injectable, signal } from '@angular/core';

import { AuthStore } from '@core/store';
import { CursoListaDto, CursoOption, CursosPorNivel } from '../models/curso.interface';
import {
  CURSO_COLORS,
  type HorarioDetalleResponseDto,
  type HorarioFormData,
  type HorarioResponseDto,
  type HorarioWeeklyBlock,
  type HorariosEstadisticas,
} from '../models/horario.interface';
import { ProfesorListDto, ProfesorOption } from '../models/profesor.interface';
import { SalonListDto, SalonOption } from '../models/salon.interface';

interface HorariosStoreState {
  // #region Datos
  horarios: HorarioResponseDto[];
  horarioDetalle: HorarioDetalleResponseDto | null;
  estadisticas: HorariosEstadisticas | null;

  // #endregion
  // #region Opciones para dropdowns
  salonesDisponibles: SalonListDto[];
  cursosDisponibles: CursoListaDto[];
  profesoresDisponibles: ProfesorListDto[];

  // #endregion
  // #region Estados de carga
  loading: boolean;
  statsLoading: boolean;
  detailLoading: boolean;
  optionsLoading: boolean; // Carga de salones/cursos

  // #endregion
  // #region UI State
  dialogVisible: boolean;
  detailDrawerVisible: boolean;
  cursoDialogVisible: boolean; // Modal de selección de cursos
  wizardStep: number; // 0: Datos básicos, 1: Asignar profesor, 2: Asignar estudiantes
  vistaActual: 'semanal' | 'lista'; // Vista activa

  // #endregion
  // #region Formulario
  formData: HorarioFormData;
  editingId: number | null;

  // #endregion
  // #region Filtros
  filtroSalonId: number | null;
  filtroProfesorId: number | null;
  filtroDiaSemana: number | null;
  filtroEstadoActivo: boolean | null;
  // #endregion
}

const initialFormData: HorarioFormData = {
  diaSemana: null,
  horaInicio: '07:00',
  horaFin: '08:00',
  salonId: null,
  cursoId: null,
  profesorId: null,
  estudianteIds: null,
};

const initialState: HorariosStoreState = {
  horarios: [],
  horarioDetalle: null,
  estadisticas: null,
  salonesDisponibles: [],
  cursosDisponibles: [],
  profesoresDisponibles: [],
  loading: false,
  statsLoading: false,
  detailLoading: false,
  optionsLoading: false,
  dialogVisible: false,
  detailDrawerVisible: false,
  cursoDialogVisible: false,
  wizardStep: 0,
  vistaActual: 'lista', // Vista por defecto es lista
  formData: { ...initialFormData },
  editingId: null,
  filtroSalonId: null,
  filtroProfesorId: null,
  filtroDiaSemana: null,
  filtroEstadoActivo: null,
};

@Injectable({ providedIn: 'root' })
export class HorariosStore {
  private authStore = inject(AuthStore);

  // #region Estado privado
  private readonly _state = signal<HorariosStoreState>(initialState);

  // #endregion
  // #region Lecturas públicas (readonly)
  readonly horarios = computed(() => this._state().horarios);
  readonly horarioDetalle = computed(() => this._state().horarioDetalle);
  readonly estadisticas = computed(() => this._state().estadisticas);
  readonly loading = computed(() => this._state().loading);
  readonly statsLoading = computed(() => this._state().statsLoading);
  readonly detailLoading = computed(() => this._state().detailLoading);
  readonly dialogVisible = computed(() => this._state().dialogVisible);
  readonly detailDrawerVisible = computed(() => this._state().detailDrawerVisible);
  readonly wizardStep = computed(() => this._state().wizardStep);
  readonly formData = computed(() => this._state().formData);
  readonly editingId = computed(() => this._state().editingId);
  readonly vistaActual = computed(() => this._state().vistaActual);
  readonly optionsLoading = computed(() => this._state().optionsLoading);

  // #endregion
  // #region Usuario actual
  readonly currentUser = this.authStore.user;

  // #endregion
  // #region Computed - Opciones de dropdowns

  /**
   * Opciones de salones disponibles (sin conflicto de horario)
   * Si está editando, excluye el horario actual de la validación
   */
  readonly salonesOptions = computed<SalonOption[]>(() => {
    const salones = this._state().salonesDisponibles;
    const horarios = this.horarios();
    const formData = this.formData();
    const editingId = this.editingId();

    // Si no hay día/hora seleccionados, mostrar todos los salones
    if (!formData.diaSemana || !formData.horaInicio || !formData.horaFin) {
      return salones
        .filter((s) => s.estado)
        .map((s) => ({
          value: s.salonId,
          label: s.nombreSalon,
          grado: s.grado,
          seccion: s.seccion,
          sede: s.sede,
          totalEstudiantes: s.totalEstudiantes,
        }));
    }

    // Filtrar salones que NO tienen conflicto de horario
    const salonesDisponibles = salones.filter((salon) => {
      if (!salon.estado) return false;

      // Verificar si el salón tiene conflicto de horario
      const tieneConflicto = horarios.some((h) => {
        // Si está editando, excluir el horario actual
        if (editingId !== null && h.id === editingId) return false;

        // Mismo salón y mismo día
        if (h.salonId === salon.salonId && h.diaSemana === formData.diaSemana) {
          // Verificar solapamiento de horarios
          const inicioForm = formData.horaInicio;
          const finForm = formData.horaFin;
          const inicioExistente = h.horaInicio;
          const finExistente = h.horaFin;

          // Hay conflicto si los rangos se solapan
          return (
            (inicioForm >= inicioExistente && inicioForm < finExistente) ||
            (finForm > inicioExistente && finForm <= finExistente) ||
            (inicioForm <= inicioExistente && finForm >= finExistente)
          );
        }

        return false;
      });

      return !tieneConflicto;
    });

    return salonesDisponibles.map((s) => ({
      value: s.salonId,
      label: s.nombreSalon,
      grado: s.grado,
      seccion: s.seccion,
      sede: s.sede,
      totalEstudiantes: s.totalEstudiantes,
    }));
  });

  /**
   * Opciones de cursos disponibles (activos) con niveles educativos
   */
  readonly cursosOptions = computed<CursoOption[]>(() => {
    const cursos = this._state().cursosDisponibles;

    return cursos
      .filter((c) => c.estado)
      .map((c) => {
        const grados = c.grados.map((g) => g.nombre);
        const niveles = this.determinarNiveles(grados);

        return {
          value: c.id,
          label: c.nombre,
          grados,
          niveles,
        };
      });
  });

  /**
   * Cursos agrupados por nivel educativo (Inicial, Primaria, Secundaria)
   */
  readonly cursosPorNivel = computed<CursosPorNivel>(() => {
    const cursos = this.cursosOptions();

    return {
      inicial: cursos.filter((c) => c.niveles.includes('Inicial')),
      primaria: cursos.filter((c) => c.niveles.includes('Primaria')),
      secundaria: cursos.filter((c) => c.niveles.includes('Secundaria')),
    };
  });

  /**
   * Opciones de profesores disponibles (activos)
   */
  readonly profesoresOptions = computed<ProfesorOption[]>(() => {
    const profesores = this._state().profesoresDisponibles;

    return profesores
      .filter((p) => p.estado)
      .map((p) => ({
        value: p.id,
        label: `${p.nombre} ${p.apellidos}`,
        dni: p.dni,
      }));
  });

  // #endregion
  // #region Computed - Filtros
  readonly horariosFiltrados = computed(() => {
    const horarios = this.horarios();
    const salonId = this._state().filtroSalonId;
    const profesorId = this._state().filtroProfesorId;
    const diaSemana = this._state().filtroDiaSemana;
    const estadoActivo = this._state().filtroEstadoActivo;
    const vistaActual = this._state().vistaActual;

    return horarios.filter((h) => {
      if (salonId !== null && h.salonId !== salonId) return false;
      if (profesorId !== null && h.profesorId !== profesorId) return false;
      // Si está en vista semanal, no filtrar por día
      if (vistaActual !== 'semanal' && diaSemana !== null && h.diaSemana !== diaSemana) return false;
      if (estadoActivo !== null && h.estado !== estadoActivo) return false;
      return true;
    });
  });

  /**
   * La vista semanal solo está disponible cuando hay un salón o profesor seleccionado
   */
  readonly vistaSemanalHabilitada = computed(() => {
    const salonId = this._state().filtroSalonId;
    const profesorId = this._state().filtroProfesorId;
    return salonId !== null || profesorId !== null;
  });

  // #endregion
  // #region Computed - Vista Semanal
  readonly horariosSemanales = computed(() => {
    const horarios = this.horariosFiltrados();
    const blocks: HorarioWeeklyBlock[] = [];

    // Asignar colores por curso
    const cursoColorMap = new Map<number, string>();
    let colorIndex = 0;

    horarios.forEach((horario) => {
      // Asignar color si no existe
      if (!cursoColorMap.has(horario.cursoId)) {
        cursoColorMap.set(horario.cursoId, CURSO_COLORS[colorIndex % CURSO_COLORS.length]);
        colorIndex++;
      }

      // Calcular duración en minutos
      const duracion = this.calcularDuracionMinutos(horario.horaInicio, horario.horaFin);

      // Calcular posición vertical (asumiendo horario desde 07:00)
      const posicion = this.calcularPosicionVertical(horario.horaInicio);

      blocks.push({
        horario,
        dia: horario.diaSemana,
        color: cursoColorMap.get(horario.cursoId) || CURSO_COLORS[0],
        duracionMinutos: duracion,
        posicionVertical: posicion,
      });
    });

    return blocks;
  });

  // #endregion
  // #region Computed - Estadísticas derivadas
  readonly totalHorarios = computed(() => this.horarios().length);
  readonly horariosActivos = computed(() => this.horarios().filter((h) => h.estado).length);
  readonly horariosInactivos = computed(() => this.horarios().filter((h) => !h.estado).length);
  readonly horariosSinProfesor = computed(() =>
    this.horarios().filter((h) => h.profesorId === null).length
  );

  // #endregion
  // #region Computed - Validaciones de formulario
  readonly formValid = computed(() => {
    const data = this.formData();

    // Validación paso 0 (datos básicos)
    if (this.wizardStep() === 0) {
      return (
        data.diaSemana !== null &&
        data.horaInicio !== '' &&
        data.horaFin !== '' &&
        data.salonId !== null &&
        data.cursoId !== null &&
        data.horaInicio < data.horaFin
      );
    }

    // Paso 1 (profesor) es opcional
    if (this.wizardStep() === 1) {
      return true;
    }

    // Paso 2 (estudiantes) es opcional
    if (this.wizardStep() === 2) {
      return true;
    }

    return false;
  });

  readonly horaInicioError = computed(() => {
    const data = this.formData();
    if (!data.horaInicio) return 'Hora de inicio requerida';
    if (data.horaInicio >= data.horaFin) return 'Hora inicio debe ser menor a hora fin';
    return null;
  });

  readonly horaFinError = computed(() => {
    const data = this.formData();
    if (!data.horaFin) return 'Hora de fin requerida';
    if (data.horaFin <= data.horaInicio) return 'Hora fin debe ser mayor a hora inicio';
    return null;
  });

  // #endregion
  // #region Computed - Estados de UI
  readonly isCreating = computed(() => this.editingId() === null);
  readonly isEditing = computed(() => this.editingId() !== null);
  readonly canGoNextStep = computed(() => this.formValid() && this.wizardStep() < 2);
  readonly canGoPrevStep = computed(() => this.wizardStep() > 0);
  readonly isLastStep = computed(() => this.wizardStep() === 2);

  /**
   * El filtro de día está habilitado solo en vista lista
   */
  readonly filtroDiaSemanaHabilitado = computed(() => this.vistaActual() === 'lista');

  // #endregion
  // #region ViewModel consolidado
  readonly vm = computed(() => ({
    horarios: this.horarios(),
    horariosFiltrados: this.horariosFiltrados(),
    horariosSemanales: this.horariosSemanales(),
    horarioDetalle: this.horarioDetalle(),
    estadisticas: this.estadisticas(),
    loading: this.loading(),
    statsLoading: this.statsLoading(),
    detailLoading: this.detailLoading(),
    dialogVisible: this.dialogVisible(),
    detailDrawerVisible: this.detailDrawerVisible(),
    wizardStep: this.wizardStep(),
    formData: this.formData(),
    editingId: this.editingId(),
    isCreating: this.isCreating(),
    isEditing: this.isEditing(),
    formValid: this.formValid(),
    horaInicioError: this.horaInicioError(),
    horaFinError: this.horaFinError(),
    canGoNextStep: this.canGoNextStep(),
    canGoPrevStep: this.canGoPrevStep(),
    isLastStep: this.isLastStep(),
    totalHorarios: this.totalHorarios(),
    horariosActivos: this.horariosActivos(),
    horariosInactivos: this.horariosInactivos(),
    horariosSinProfesor: this.horariosSinProfesor(),
    isEmpty: this.horarios().length === 0,
    hasFilters:
      this._state().filtroSalonId !== null ||
      this._state().filtroProfesorId !== null ||
      this._state().filtroDiaSemana !== null ||
      this._state().filtroEstadoActivo !== null,
    // Filtros actuales
    filtroSalonId: this._state().filtroSalonId,
    filtroProfesorId: this._state().filtroProfesorId,
    filtroDiaSemana: this._state().filtroDiaSemana,
    filtroEstadoActivo: this._state().filtroEstadoActivo,
    currentUser: this.currentUser(),
    vistaActual: this.vistaActual(),
    vistaSemanalHabilitada: this.vistaSemanalHabilitada(),
    filtroDiaSemanaHabilitado: this.filtroDiaSemanaHabilitado(),
    salonesOptions: this.salonesOptions(),
    cursosOptions: this.cursosOptions(),
    cursosPorNivel: this.cursosPorNivel(),
    profesoresOptions: this.profesoresOptions(),
    cursoDialogVisible: this._state().cursoDialogVisible,
    optionsLoading: this.optionsLoading(),
  }));

  // #endregion
  // #region Comandos de mutación - Lista
  setHorarios(horarios: HorarioResponseDto[]): void {
    this._state.update((s) => ({ ...s, horarios }));
  }

  // #endregion
  // #region Comandos de mutación - Opciones
  setSalonesDisponibles(salones: SalonListDto[]): void {
    this._state.update((s) => ({ ...s, salonesDisponibles: salones }));
  }

  setCursosDisponibles(cursos: CursoListaDto[]): void {
    this._state.update((s) => ({ ...s, cursosDisponibles: cursos }));
  }

  setProfesoresDisponibles(profesores: ProfesorListDto[]): void {
    this._state.update((s) => ({ ...s, profesoresDisponibles: profesores }));
  }

  setOptionsLoading(loading: boolean): void {
    this._state.update((s) => ({ ...s, optionsLoading: loading }));
  }

  /**
   * Mutación quirúrgica: Actualizar un horario específico sin refetch
   */
  updateHorario(id: number, updates: Partial<HorarioResponseDto>): void {
    this._state.update((s) => ({
      ...s,
      horarios: s.horarios.map((h) => (h.id === id ? { ...h, ...updates } : h)),
    }));
  }

  /**
   * Mutación quirúrgica: Toggle estado de un horario
   */
  toggleHorarioEstado(id: number): void {
    this._state.update((s) => ({
      ...s,
      horarios: s.horarios.map((h) => (h.id === id ? { ...h, estado: !h.estado } : h)),
    }));
  }

  /**
   * Mutación quirúrgica: Eliminar un horario
   */
  removeHorario(id: number): void {
    this._state.update((s) => ({
      ...s,
      horarios: s.horarios.filter((h) => h.id !== id),
    }));
  }

  // #endregion
  // #region Comandos de mutación - Detalle
  setHorarioDetalle(detalle: HorarioDetalleResponseDto | null): void {
    this._state.update((s) => ({ ...s, horarioDetalle: detalle }));
  }

  // #endregion
  // #region Comandos de mutación - Estadísticas
  setEstadisticas(estadisticas: HorariosEstadisticas | null): void {
    this._state.update((s) => ({ ...s, estadisticas }));
  }

  incrementarEstadistica(campo: keyof HorariosEstadisticas, delta: number): void {
    this._state.update((s) => {
      if (!s.estadisticas) return s;
      return {
        ...s,
        estadisticas: {
          ...s.estadisticas,
          [campo]: (s.estadisticas[campo] || 0) + delta,
        },
      };
    });
  }

  // #endregion
  // #region Comandos de mutación - Loading
  setLoading(loading: boolean): void {
    this._state.update((s) => ({ ...s, loading }));
  }

  setStatsLoading(loading: boolean): void {
    this._state.update((s) => ({ ...s, statsLoading: loading }));
  }

  setDetailLoading(loading: boolean): void {
    this._state.update((s) => ({ ...s, detailLoading: loading }));
  }

  // #endregion
  // #region Comandos de mutación - UI State
  openDialog(): void {
    this._state.update((s) => ({ ...s, dialogVisible: true }));
  }

  closeDialog(): void {
    this._state.update((s) => ({
      ...s,
      dialogVisible: false,
      wizardStep: 0,
      formData: { ...initialFormData },
      editingId: null,
    }));
  }

  openDetailDrawer(): void {
    this._state.update((s) => ({ ...s, detailDrawerVisible: true }));
  }

  closeDetailDrawer(): void {
    this._state.update((s) => ({
      ...s,
      detailDrawerVisible: false,
      horarioDetalle: null,
    }));
  }

  openCursoDialog(): void {
    this._state.update((s) => ({ ...s, cursoDialogVisible: true }));
  }

  closeCursoDialog(): void {
    this._state.update((s) => ({ ...s, cursoDialogVisible: false }));
  }

  setVistaActual(vista: 'semanal' | 'lista'): void {
    this._state.update((s) => ({
      ...s,
      vistaActual: vista,
      // Si cambia a vista semanal, limpiar filtro de día
      filtroDiaSemana: vista === 'semanal' ? null : s.filtroDiaSemana,
    }));
  }

  // #endregion
  // #region Comandos de mutación - Wizard
  nextStep(): void {
    this._state.update((s) => ({
      ...s,
      wizardStep: Math.min(s.wizardStep + 1, 2),
    }));
  }

  prevStep(): void {
    this._state.update((s) => ({
      ...s,
      wizardStep: Math.max(s.wizardStep - 1, 0),
    }));
  }

  resetWizard(): void {
    this._state.update((s) => ({
      ...s,
      wizardStep: 0,
    }));
  }

  // #endregion
  // #region Comandos de mutación - Formulario
  setFormData(data: Partial<HorarioFormData>): void {
    this._state.update((s) => ({
      ...s,
      formData: { ...s.formData, ...data },
    }));
  }

  clearFormData(): void {
    this._state.update((s) => ({
      ...s,
      formData: { ...initialFormData },
      editingId: null,
    }));
  }

  setEditingId(id: number | null): void {
    this._state.update((s) => ({ ...s, editingId: id }));
  }

  // #endregion
  // #region Comandos de mutación - Filtros
  setFiltroSalon(salonId: number | null): void {
    this._state.update((s) => ({ ...s, filtroSalonId: salonId }));
  }

  setFiltroProfesor(profesorId: number | null): void {
    this._state.update((s) => ({ ...s, filtroProfesorId: profesorId }));
  }

  setFiltroDiaSemana(diaSemana: number | null): void {
    this._state.update((s) => ({ ...s, filtroDiaSemana: diaSemana }));
  }

  setFiltroEstadoActivo(estadoActivo: boolean | null): void {
    this._state.update((s) => ({ ...s, filtroEstadoActivo: estadoActivo }));
  }

  clearFiltros(): void {
    this._state.update((s) => ({
      ...s,
      filtroSalonId: null,
      filtroProfesorId: null,
      filtroDiaSemana: null,
      filtroEstadoActivo: null,
    }));
  }

  // #endregion
  // #region Helpers privados
  private calcularDuracionMinutos(horaInicio: string, horaFin: string): number {
    const [hi, mi] = horaInicio.split(':').map(Number);
    const [hf, mf] = horaFin.split(':').map(Number);
    const minutosInicio = hi * 60 + mi;
    const minutosFin = hf * 60 + mf;
    return minutosFin - minutosInicio;
  }

  private calcularPosicionVertical(horaInicio: string): number {
    // Asumiendo que el horario empieza a las 07:00
    const HORA_INICIO_DIA = 7 * 60; // 7:00 AM en minutos
    const [h, m] = horaInicio.split(':').map(Number);
    const minutosDesdeInicio = h * 60 + m;
    return minutosDesdeInicio - HORA_INICIO_DIA;
  }

  /**
   * Determina los niveles educativos basándose en los nombres de grados
   */
  private determinarNiveles(grados: string[]): string[] {
    const niveles = new Set<string>();

    grados.forEach((grado) => {
      const gradoLower = grado.toLowerCase();

      // Detectar Inicial
      if (gradoLower.includes('inicial') || gradoLower.includes('años')) {
        niveles.add('Inicial');
      }

      // Detectar Primaria
      if (gradoLower.includes('primaria')) {
        niveles.add('Primaria');
      }

      // Detectar Secundaria
      if (gradoLower.includes('secundaria')) {
        niveles.add('Secundaria');
      }
    });

    // Retornar en orden lógico
    const orden = ['Inicial', 'Primaria', 'Secundaria'];
    return orden.filter((nivel) => niveles.has(nivel));
  }
  // #endregion
}
