/**
 * Notificación de asistencia recibida vía SignalR
 */
export interface NotificacionAsistencia {
  id: string;
  tipo: 'asistencia';
  dni: string;
  nombreEstudiante: string;
  tipoMarcacion: 'entrada' | 'salida';
  fecha: string;
  hora: string;
  sede: string;
  mensaje: string;
  timestamp: string;
}

/**
 * Estado de la conexión SignalR
 */
export type SignalRConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

/**
 * Configuración del servicio SignalR
 */
export interface SignalRConfig {
  hubUrl: string;
  reconnectIntervals: number[];
  maxReconnectAttempts: number;
}
