import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * SRP: Ответственность - только загрузка сырых ассетов из сети/файловой системы.
 */
export class AssetLoader {
    private static gltfLoader = new GLTFLoader();

    /**
     * Загружает изображение как HTMLImageElement.
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

    /**
     * Загружает GLTF/GLB модель.
     */
    public static loadGLTF(url: string): Promise<GLTF> {
        return new Promise((resolve, reject) => {
            this.gltfLoader.load(
                url,
                (gltf) => resolve(gltf),
                undefined,
                (err) => reject(err)
            );
        });
    }
}
