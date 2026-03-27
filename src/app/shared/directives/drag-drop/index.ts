/**
 * Drag-drop — punto único de acoplamiento.
 *
 * Actualmente usa @angular/cdk/drag-drop.
 * Si CDK se elimina, comentar el bloque "CDK" y descomentar el bloque "Nativo".
 * Ni templates ni componentes necesitan cambiar.
 */

// --- CDK (activo) ---
export { CdkDropList, CdkDrag, CdkDragHandle } from '@angular/cdk/drag-drop';
export type { CdkDragDrop } from '@angular/cdk/drag-drop';

// --- Nativo (fallback) ---
// export { CdkDropList, CdkDrag, CdkDragHandle } from './native-drag-drop';
// export type { CdkDragDrop } from './native-drag-drop';
