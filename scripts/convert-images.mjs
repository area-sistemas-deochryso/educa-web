import { basename, extname, join } from 'path';
import { readdir, stat } from 'fs/promises';

import { dirname } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const IMAGES_DIR = join(__dirname, '..', 'public', 'images');
const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png'];

// Configuración de calidad
const WEBP_QUALITY = 80;
const AVIF_QUALITY = 65;

async function getAllImages(dir) {
	const images = [];

	async function scan(currentDir) {
		const entries = await readdir(currentDir, { withFileTypes: true });

		for (const entry of entries) {
			const fullPath = join(currentDir, entry.name);

			if (entry.isDirectory()) {
				await scan(fullPath);
			} else if (entry.isFile()) {
				const ext = extname(entry.name).toLowerCase();
				if (SUPPORTED_EXTENSIONS.includes(ext)) {
					images.push(fullPath);
				}
			}
		}
	}

	await scan(dir);
	return images;
}

async function convertImage(imagePath) {
	const dir = dirname(imagePath);
	const name = basename(imagePath, extname(imagePath));
	const webpPath = join(dir, `${name}.webp`);
	const avifPath = join(dir, `${name}.avif`);

	try {
		const image = sharp(imagePath);
		const metadata = await image.metadata();

		// Convertir a WebP
		await sharp(imagePath).webp({ quality: WEBP_QUALITY }).toFile(webpPath);

		// Convertir a AVIF
		await sharp(imagePath).avif({ quality: AVIF_QUALITY }).toFile(avifPath);

		// Obtener tamaños para comparar
		const originalStats = await stat(imagePath);
		const webpStats = await stat(webpPath);
		const avifStats = await stat(avifPath);

		const originalSize = (originalStats.size / 1024).toFixed(1);
		const webpSize = (webpStats.size / 1024).toFixed(1);
		const avifSize = (avifStats.size / 1024).toFixed(1);
		const webpSavings = ((1 - webpStats.size / originalStats.size) * 100).toFixed(0);
		const avifSavings = ((1 - avifStats.size / originalStats.size) * 100).toFixed(0);

		console.log(`✓ ${basename(imagePath)}`);
		console.log(
			`  Original: ${originalSize}KB → WebP: ${webpSize}KB (-${webpSavings}%) | AVIF: ${avifSize}KB (-${avifSavings}%)`,
		);

		return {
			original: originalStats.size,
			webp: webpStats.size,
			avif: avifStats.size,
		};
	} catch (error) {
		console.error(`✗ Error con ${imagePath}:`, error.message);
		return null;
	}
}

async function main() {
	console.log('🖼️  Iniciando conversión de imágenes a WebP y AVIF...\n');
	console.log(`📁 Directorio: ${IMAGES_DIR}\n`);

	const images = await getAllImages(IMAGES_DIR);
	console.log(`📊 Encontradas ${images.length} imágenes para convertir\n`);

	let totalOriginal = 0;
	let totalWebp = 0;
	let totalAvif = 0;
	let converted = 0;

	for (const imagePath of images) {
		const result = await convertImage(imagePath);
		if (result) {
			totalOriginal += result.original;
			totalWebp += result.webp;
			totalAvif += result.avif;
			converted++;
		}
	}

	console.log('\n' + '='.repeat(60));
	console.log('📈 RESUMEN DE CONVERSIÓN');
	console.log('='.repeat(60));
	console.log(`Imágenes convertidas: ${converted}/${images.length}`);
	console.log(`Tamaño original total: ${(totalOriginal / 1024 / 1024).toFixed(2)} MB`);
	console.log(
		`Tamaño WebP total: ${(totalWebp / 1024 / 1024).toFixed(2)} MB (${((1 - totalWebp / totalOriginal) * 100).toFixed(0)}% ahorro)`,
	);
	console.log(
		`Tamaño AVIF total: ${(totalAvif / 1024 / 1024).toFixed(2)} MB (${((1 - totalAvif / totalOriginal) * 100).toFixed(0)}% ahorro)`,
	);
	console.log('='.repeat(60));
	console.log('\n✅ Conversión completada!');
	console.log('💡 Ahora actualiza las referencias en tu código para usar los nuevos formatos.');
}

main().catch(console.error);
