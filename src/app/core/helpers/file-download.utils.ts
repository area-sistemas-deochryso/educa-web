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
 * Strip accents, spaces and punctuation from a label so it's safe to use as a filename segment.
 *
 * @example
 * sanitizeFileNameSegment('Asist. Admin.'); // 'AsistAdmin'
 * sanitizeFileNameSegment('Día'); // 'Dia'
 */
export function sanitizeFileNameSegment(label: string): string {
	return label.normalize('NFD').replace(/[^a-zA-Z0-9]/g, '');
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
