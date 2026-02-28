/**
 * Open a Blob in a new browser tab and revoke its object URL.
 *
 * @param blob File data to view.
 * @example
 * viewBlobInNewTab(pdfBlob);
 */
export function viewBlobInNewTab(blob: Blob): void {
	const url = window.URL.createObjectURL(blob);
	window.open(url, '_blank');
	setTimeout(() => window.URL.revokeObjectURL(url), 100);
}

/**
 * Download a Blob as a file and revoke its object URL.
 *
 * @param blob File data to download.
 * @param fileName File name to save as.
 * @example
 * downloadBlob(pdfBlob, 'report.pdf');
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
