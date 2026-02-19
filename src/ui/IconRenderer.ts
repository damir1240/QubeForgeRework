import * as THREE from "three";
import { ItemMeshFactory } from "../utils/ItemMeshFactory";
import { BlockRegistry, ItemRegistry } from "../modding/Registry";

export class IconRenderer {
    private static instance: IconRenderer;
    private renderer: THREE.WebGLRenderer;
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private cache: Map<number, string> = new Map();

    private constructor() {
        // Hidden canvas for rendering
        const canvas = document.createElement("canvas");
        canvas.width = 64;
        canvas.height = 64;

        this.renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            alpha: true,
        });
        this.renderer.setSize(64, 64);
        this.renderer.setClearColor(0x000000, 0);

        this.scene = new THREE.Scene();

        // Lighting similar to Minecraft's inventory
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);

        const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight1.position.set(1, 1, 0.5);
        this.scene.add(directionalLight1);

        const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.2);
        directionalLight2.position.set(-1, 0.5, 0.5);
        this.scene.add(directionalLight2);

        this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 10);
        this.camera.position.set(0.6, 0.6, 0.6); // Zoom in
        this.camera.lookAt(0, 0, 0);
    }

    public static getInstance(): IconRenderer {
        if (!IconRenderer.instance) {
            IconRenderer.instance = new IconRenderer();
        }
        return IconRenderer.instance;
    }

    /**
     * Renders a 3D icon for the given item ID and returns it as a Data URL.
     */
    public getIcon(id: number): string {
        try {
            if (this.cache.has(id)) {
                return this.cache.get(id)!;
            }

            const itemConfig = ItemRegistry.getById(id);
            const blockConfig = BlockRegistry.getById(id);

            // 1. If it's a tool or specific item entity, use 2D texture directly from assets
            if (itemConfig) {
                const textureName = itemConfig.texture;
                const path = `/assets/qubeforge/textures/items/${textureName}.png`;
                this.cache.set(id, path);
                return path;
            }

            // 2. If it's a block, render as 3D (Isometric)
            if (blockConfig) {
                const mesh = ItemMeshFactory.createMesh(id);
                if (!mesh) return "";

                // Clear previous mesh
                for (let i = this.scene.children.length - 1; i >= 0; i--) {
                    const child = this.scene.children[i];
                    if (!(child instanceof THREE.Light)) {
                        this.scene.remove(child);
                    }
                }

                this.scene.add(mesh);

                // For blocks, use isometric view. 
                // Camera is already at (0.6, 0.6, 0.6) looking at origin.
                mesh.rotation.set(0, 0, 0);

                this.renderer.render(this.scene, this.camera);
                const dataUrl = this.renderer.domElement.toDataURL();
                this.cache.set(id, dataUrl);

                // Cleanup mesh
                if (mesh.geometry) mesh.geometry.dispose();

                return dataUrl;
            }

            return "";
        } catch (e) {
            console.error("IconRenderer error:", id, e);
            return "";
        }
    }

    /**
     * Pre-renders icons for common items (optional optimization)
     */
    public async preRender(ids: number[]) {
        for (const id of ids) {
            this.getIcon(id);
        }
    }
}
