import * as THREE from 'three';

/**
 * SRP: Ответственность - сборка единого атласа из набора изображений.
 * KISS: Используем простой горизонтальный атлас (ленту).
 */
export class TextureAtlasBuilder {
    private readonly tileSize: number;

    constructor(tileSize: number = 16) {
        this.tileSize = tileSize;
    }

    /**
     * Склеивает все переданные изображения в одну текстуру-ленту.
     * @param images Карта "название_текстуры" -> "изображение"
     */
    public build(images: Map<string, HTMLImageElement>): {
        texture: THREE.CanvasTexture,
        mapping: Map<string, number>,
        slotCount: number
    } {
        const keys = Array.from(images.keys());
        const count = Math.max(1, keys.length);

        const canvas = document.createElement('canvas');
        canvas.width = count * this.tileSize;
        canvas.height = this.tileSize;

        const ctx = canvas.getContext('2d')!;
        ctx.imageSmoothingEnabled = false;

        const mapping = new Map<string, number>();

        keys.forEach((name, index) => {
            const img = images.get(name)!;
            ctx.drawImage(img, index * this.tileSize, 0, this.tileSize, this.tileSize);
            mapping.set(name, index);
        });

        const texture = new THREE.CanvasTexture(canvas);
        // Для вокселей важно отключать сглаживание
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        texture.generateMipmaps = false;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.needsUpdate = true;
        texture.colorSpace = THREE.SRGBColorSpace;

        return {
            texture,
            mapping,
            slotCount: count
        };
    }

    /**
     * Создает изображение-заглушку (checkerboard) для отсутствующих текстур.
     */
    public createFallbackImage(): HTMLImageElement {
        const canvas = document.createElement('canvas');
        canvas.width = this.tileSize;
        canvas.height = this.tileSize;
        const ctx = canvas.getContext('2d')!;

        const size = this.tileSize / 2;
        ctx.fillStyle = '#ff00ff'; // Magenta
        ctx.fillRect(0, 0, size, size);
        ctx.fillRect(size, size, size, size);

        ctx.fillStyle = '#000000'; // Black
        ctx.fillRect(size, 0, size, size);
        ctx.fillRect(0, size, size, size);

        const img = new Image();
        // Мы используем dataURL для синхронного получения Image
        img.src = canvas.toDataURL();
        return img;
    }
}
