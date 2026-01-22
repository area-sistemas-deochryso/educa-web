import { Injectable, signal, computed, Type } from '@angular/core'

/**
 * Configuración de un modal
 */
export interface ModalConfig<T = unknown> {
	/** Identificador único del modal */
	id: string
	/** Título del modal */
	title?: string
	/** Datos a pasar al modal */
	data?: T
	/** Si el modal se puede cerrar haciendo clic fuera */
	dismissible?: boolean
	/** Si el modal tiene botón de cerrar */
	closable?: boolean
	/** Tamaño del modal */
	size?: 'sm' | 'md' | 'lg' | 'xl' | 'fullscreen'
	/** Clase CSS adicional */
	styleClass?: string
	/** Callback al cerrar */
	onClose?: (result?: unknown) => void
}

/**
 * Estado de un modal
 */
export interface ModalState<T = unknown> extends ModalConfig<T> {
	/** Si el modal está visible */
	visible: boolean
	/** Componente a renderizar (opcional, para modales dinámicos) */
	component?: Type<unknown>
}

/**
 * Resultado al cerrar un modal
 */
export interface ModalResult<T = unknown> {
	/** Si el modal fue confirmado (no cancelado) */
	confirmed: boolean
	/** Datos devueltos por el modal */
	data?: T
}

/**
 * Modal Manager Service
 *
 * Gestiona el estado de múltiples modales en la aplicación de forma centralizada.
 * Soporta modales anidados, persistencia de estado y navegación por teclado.
 *
 * @example
 * ```typescript
 * // En un componente
 * readonly modalManager = inject(ModalManagerService)
 *
 * // Abrir un modal
 * openDetails() {
 *   this.modalManager.open({
 *     id: 'course-details',
 *     title: 'Detalles del Curso',
 *     data: { courseId: 123 },
 *     onClose: (result) => console.log('Cerrado:', result)
 *   })
 * }
 *
 * // Cerrar un modal
 * this.modalManager.close('course-details')
 *
 * // Verificar si está abierto
 * if (this.modalManager.isOpen('course-details')()) { ... }
 *
 * // Obtener datos del modal
 * const data = this.modalManager.getData('course-details')
 * ```
 */
@Injectable({
	providedIn: 'root',
})
export class ModalManagerService {
	/** Stack de modales abiertos (para manejar modales anidados) */
	private readonly _modals = signal<Map<string, ModalState>>(new Map())

	/** Historial de modales para navegación hacia atrás */
	private readonly _history = signal<string[]>([])

	/** Lista de IDs de modales abiertos */
	readonly openModals = computed(() => {
		return Array.from(this._modals().entries())
			.filter(([_, state]) => state.visible)
			.map(([id]) => id)
	})

	/** Si hay algún modal abierto */
	readonly hasOpenModals = computed(() => this.openModals().length > 0)

	/** El modal actualmente activo (el más reciente) */
	readonly activeModal = computed(() => {
		const open = this.openModals()
		return open.length > 0 ? open[open.length - 1] : null
	})

	/** Cantidad de modales abiertos */
	readonly modalCount = computed(() => this.openModals().length)

	/**
	 * Abre un modal
	 */
	open<T = unknown>(config: ModalConfig<T>): void {
		const modals = new Map(this._modals())
		const state: ModalState<T> = {
			...config,
			visible: true,
			dismissible: config.dismissible ?? true,
			closable: config.closable ?? true,
			size: config.size ?? 'md',
		}

		modals.set(config.id, state as ModalState)
		this._modals.set(modals)

		// Agregar al historial
		const history = [...this._history()]
		if (!history.includes(config.id)) {
			history.push(config.id)
			this._history.set(history)
		}
	}

	/**
	 * Cierra un modal
	 */
	close<T = unknown>(id: string, result?: ModalResult<T>): void {
		const modals = new Map(this._modals())
		const modal = modals.get(id)

		if (modal) {
			// Ejecutar callback de cierre
			if (modal.onClose) {
				modal.onClose(result)
			}

			// Marcar como no visible
			modals.set(id, { ...modal, visible: false })
			this._modals.set(modals)

			// Actualizar historial
			const history = this._history().filter(h => h !== id)
			this._history.set(history)
		}
	}

	/**
	 * Cierra el modal activo (el más reciente)
	 */
	closeActive<T = unknown>(result?: ModalResult<T>): void {
		const active = this.activeModal()
		if (active) {
			this.close(active, result)
		}
	}

	/**
	 * Cierra todos los modales
	 */
	closeAll(): void {
		const modals = new Map(this._modals())
		modals.forEach((modal, id) => {
			if (modal.visible && modal.onClose) {
				modal.onClose({ confirmed: false })
			}
			modals.set(id, { ...modal, visible: false })
		})
		this._modals.set(modals)
		this._history.set([])
	}

	/**
	 * Toggle de un modal
	 */
	toggle<T = unknown>(config: ModalConfig<T>): void {
		if (this.isOpen(config.id)()) {
			this.close(config.id)
		} else {
			this.open(config)
		}
	}

	/**
	 * Verifica si un modal está abierto
	 */
	isOpen(id: string) {
		return computed(() => {
			const modal = this._modals().get(id)
			return modal?.visible ?? false
		})
	}

	/**
	 * Obtiene el estado de un modal
	 */
	getState<T = unknown>(id: string) {
		return computed(() => {
			return this._modals().get(id) as ModalState<T> | undefined
		})
	}

	/**
	 * Obtiene los datos de un modal
	 */
	getData<T = unknown>(id: string): T | undefined {
		const modal = this._modals().get(id)
		return modal?.data as T | undefined
	}

	/**
	 * Actualiza los datos de un modal
	 */
	updateData<T = unknown>(id: string, data: Partial<T>): void {
		const modals = new Map(this._modals())
		const modal = modals.get(id)

		if (modal) {
			modals.set(id, {
				...modal,
				data: { ...(modal.data as object), ...data },
			})
			this._modals.set(modals)
		}
	}

	/**
	 * Registra un modal (sin abrirlo)
	 */
	register<T = unknown>(config: ModalConfig<T>): void {
		const modals = new Map(this._modals())
		if (!modals.has(config.id)) {
			modals.set(config.id, {
				...config,
				visible: false,
				dismissible: config.dismissible ?? true,
				closable: config.closable ?? true,
				size: config.size ?? 'md',
			} as ModalState)
			this._modals.set(modals)
		}
	}

	/**
	 * Desregistra un modal
	 */
	unregister(id: string): void {
		const modals = new Map(this._modals())
		modals.delete(id)
		this._modals.set(modals)

		const history = this._history().filter(h => h !== id)
		this._history.set(history)
	}

	/**
	 * Navega al modal anterior en el historial
	 */
	goBack(): void {
		const history = [...this._history()]
		if (history.length > 1) {
			const current = history.pop()
			if (current) {
				this.close(current)
			}
		}
	}

	/**
	 * Confirma el modal activo con datos
	 */
	confirm<T = unknown>(data?: T): void {
		this.closeActive({ confirmed: true, data })
	}

	/**
	 * Cancela el modal activo
	 */
	cancel(): void {
		this.closeActive({ confirmed: false })
	}
}
