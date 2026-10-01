// #region Tipos
export type FileKind = 'pdf' | 'word' | 'excel' | 'ppt' | 'image' | 'video' | 'audio' | 'archive' | 'text' | 'other';

export interface FileKindMeta {
	/** Clase PrimeIcons completa (ej. `pi pi-file-pdf`). */
	readonly icon: string;
	/** Sufijo para modificadores de color (`file-row__icon--<kind>`). */
	readonly kind: FileKind;
}

export interface FileDescriptor {
	mimeType?: string | null;
	fileName?: string | null;
}
// #endregion

// #region Clasificador
const EXTENSION_KIND: Readonly<Record<string, FileKind>> = {
	pdf: 'pdf',
	doc: 'word',
	docx: 'word',
	odt: 'word',
	xls: 'excel',
	xlsx: 'excel',
	ods: 'excel',
	csv: 'excel',
	ppt: 'ppt',
	pptx: 'ppt',
	odp: 'ppt',
	jpg: 'image',
	jpeg: 'image',
	png: 'image',
	webp: 'image',
	gif: 'image',
	svg: 'image',
	mp4: 'video',
	webm: 'video',
	avi: 'video',
	mov: 'video',
	mp3: 'audio',
	zip: 'archive',
	zipx: 'archive',
	rar: 'archive',
	'7z': 'archive',
	tar: 'archive',
	gz: 'archive',
	txt: 'text',
	epub: 'text',
};

const ICON_BY_KIND: Readonly<Record<FileKind, string>> = {
	pdf: 'pi pi-file-pdf',
	word: 'pi pi-file-word',
	excel: 'pi pi-file-excel',
	ppt: 'pi pi-file',
	image: 'pi pi-image',
	video: 'pi pi-video',
	audio: 'pi pi-volume-up',
	archive: 'pi pi-box',
	text: 'pi pi-file',
	other: 'pi pi-file',
};

function classifyByMime(mime: string): FileKind | null {
	const value = mime.toLowerCase();
	if (value.includes('pdf')) return 'pdf';
	if (value.startsWith('image/')) return 'image';
	if (value.startsWith('video/')) return 'video';
	if (value.startsWith('audio/')) return 'audio';
	if (value.includes('presentation') || value.includes('powerpoint')) return 'ppt';
	if (value.includes('spreadsheet') || value.includes('excel') || value === 'text/csv') return 'excel';
	if (value.includes('word') || value.includes('wordprocessingml') || value.includes('opendocument.text')) return 'word';
	if (value === 'application/epub+zip') return 'text';
	if (value.includes('zip') || value.includes('rar') || value.includes('7z') || value.includes('gzip') || value.includes('x-tar') || value.includes('compressed')) return 'archive';
	if (value.startsWith('text/')) return 'text';
	return null;
}

function classifyByExtension(fileName: string): FileKind | null {
	const dot = fileName.lastIndexOf('.');
	if (dot < 0) return null;
	return EXTENSION_KIND[fileName.slice(dot + 1).toLowerCase()] ?? null;
}

/** Clasifica un archivo por MIME (más confiable) y cae a la extensión del nombre. */
export function classifyFile({ mimeType, fileName }: FileDescriptor): FileKind {
	return (mimeType && classifyByMime(mimeType)) || (fileName && classifyByExtension(fileName)) || 'other';
}

export function getFileKindMeta(descriptor: FileDescriptor): FileKindMeta {
	const kind = classifyFile(descriptor);
	return { kind, icon: ICON_BY_KIND[kind] };
}
// #endregion

// #region Tamaño
const SIZE_UNITS = ['B', 'KB', 'MB', 'GB'] as const;

export function formatFileSize(bytes: number | null | undefined): string {
	if (bytes == null || bytes <= 0) return '0 B';
	const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), SIZE_UNITS.length - 1);
	return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(1))} ${SIZE_UNITS[i]}`;
}
// #endregion
