import * as THREE from 'three';

/**
 * SRP: Ответственность - только загрузка сырых ассетов из сети/файловой системы.
 */
export class AssetLoader {
    /**
     * Загружает изображение как HTMLImageElement.
     * HTMLImageElement необходим для отрисовки на Canvas при сборке атласа.
     */
    public static loadImage(url: string): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`Failed to load image at ${url}`));
            img.src = url;
        });
    }

    /**
     * Загружает текстуру напрямую через THREE.TextureLoader.
     */
    public static loadThreeTexture(url: string): Promise<THREE.Texture> {
        return new Promise((resolve, reject) => {
            const loader = new THREE.TextureLoader();
            loader.load(
                url,
                (texture) => resolve(texture),
                undefined,
                (err) => reject(err)
            );
        });
    }
}
