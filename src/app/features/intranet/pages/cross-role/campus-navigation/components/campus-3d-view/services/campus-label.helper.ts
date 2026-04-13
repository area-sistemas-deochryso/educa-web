import * as THREE from 'three';

/**
 * Builds a THREE.Sprite with a text label rendered via canvas.
 * Pure — no scene mutation.
 */
export function makeLabelSprite(text: string, color: number): THREE.Sprite {
	const canvas = document.createElement('canvas');
	canvas.width = 320;
	canvas.height = 72;
	const ctx = canvas.getContext('2d')!;

	const r = (color >> 16) & 0xff;
	const g = (color >> 8) & 0xff;
	const b = color & 0xff;
	ctx.fillStyle = `rgba(${r},${g},${b},0.88)`;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	(ctx as any).roundRect?.(4, 4, 312, 64, 12);
	ctx.fill();

	ctx.strokeStyle = 'rgba(255,255,255,0.6)';
	ctx.lineWidth = 2;
	ctx.stroke();

	ctx.fillStyle = '#ffffff';
	ctx.font = 'bold 22px system-ui, sans-serif';
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.shadowColor = 'rgba(0,0,0,0.4)';
	ctx.shadowBlur = 3;
	ctx.fillText(text.slice(0, 22), 160, 36);

	const tex = new THREE.CanvasTexture(canvas);
	const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true, opacity: 0 });
	const sprite = new THREE.Sprite(mat);
	sprite.scale.set(3.8, 0.85, 1);
	return sprite;
}
