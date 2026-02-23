/**
 * Abre un Blob PDF en una nueva pestaña del navegador.
 * Limpia el Object URL automáticamente.
 */
export function viewBlobInNewTab(blob: Blob): void {
	const url = window.URL.createObjectURL(blob);
	window.open(url, '_blank');
	setTimeout(() => window.URL.revokeObjectURL(url), 100);
}

/**
 * Descarga un Blob como archivo con el nombre dado.
 * Crea un enlace temporal, lo activa y limpia el Object URL.
 */
export function downloadBlob(blob: Blob, fileName: string): void {
	const url = window.URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = fileName;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	window.URL.revokeObjectURL(url);
}
