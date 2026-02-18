import { AssetLoader } from './AssetLoader';
import { TextureAtlasBuilder } from './TextureAtlasBuilder';
import { BlockRegistry, ItemRegistry } from '../../modding/Registry';
import * as THREE from 'three';

/**
 * ОРКЕСТРАТОР: Управляет жизненным циклом текстур в игре.
 * Находит нужные текстуры, загружает их и создает атлас.
 */
export class VoxelTextureManager {
    private static instance: VoxelTextureManager;

    private atlasTexture: THREE.CanvasTexture | null = null;
    private mapping: Map<string, number> = new Map();
    private slotCount: number = 0;

    private itemAtlasTexture: THREE.CanvasTexture | null = null;
    private itemMapping: Map<string, number> = new Map();
    private itemSlotCount: number = 0;
    private itemImages: Map<string, HTMLImageElement> = new Map();

    private constructor() { }

    public static getInstance(): VoxelTextureManager {
        if (!VoxelTextureManager.instance) {
            VoxelTextureManager.instance = new VoxelTextureManager();
        }
        return VoxelTextureManager.instance;
    }

    /**
     * Инициализирует систему текстур.
     * 1. Собирает список всех необходимых текстур из реестра блоков.
     * 2. Загружает соответствующие PNG файлы из /assets/.
     * 3. Формирует единый атлас.
     */
    public async init(): Promise<void> {
        const builder = new TextureAtlasBuilder(16);
        const fallback = builder.createFallbackImage();

        // 1. Загружаем текстуры блоков
        const blockNames = this.collectRequiredBlockTextureNames();
        const blockImages = new Map<string, HTMLImageElement>();

        await Promise.all(blockNames.map(async (name) => {
            if (!name) return;
            try {
                const path = `/assets/qubeforge/textures/blocks/${name}.png`;
                const img = await AssetLoader.loadImage(path);
                blockImages.set(name, img);
            } catch (err) {
                console.warn(`[TextureManager] Failed to load block texture: ${name}`);
                blockImages.set(name, fallback);
            }
        }));

        const blockAtlas = builder.build(blockImages);
        this.atlasTexture = blockAtlas.texture;
        this.mapping = blockAtlas.mapping;
        this.slotCount = blockAtlas.slotCount;

        // 2. Загружаем текстуры предметов
        const itemNames = this.collectRequiredItemTextureNames();
        const itemImages = new Map<string, HTMLImageElement>();

        await Promise.all(itemNames.map(async (name) => {
            if (!name) return;
            try {
                const path = `/assets/qubeforge/textures/items/${name}.png`;
                const img = await AssetLoader.loadImage(path);
                itemImages.set(name, img);
            } catch (err) {
                console.warn(`[TextureManager] Failed to load item texture: ${name}`);
                itemImages.set(name, fallback);
            }
        }));

        // Если предметов нет, добавим заглушку
        if (itemImages.size === 0) itemImages.set('fallback', fallback);

        const itemAtlas = builder.build(itemImages);
        this.itemAtlasTexture = itemAtlas.texture;
        this.itemMapping = itemAtlas.mapping;
        this.itemSlotCount = itemAtlas.slotCount;
        this.itemImages = itemImages;

        console.log(`[TextureManager] Atlas built: Blocks(${this.slotCount}), Items(${this.itemSlotCount})`);
    }

    /**
     * Сканирует BlockRegistry и собирает все уникальные имена текстур блоков.
     */
    private collectRequiredBlockTextureNames(): string[] {
        const names = new Set<string>();
        const blocks = BlockRegistry.getAll();

        blocks.forEach((config) => {
            if (!config.texture) return;

            if (typeof config.texture === 'string') {
                names.add(config.texture);
            } else {
                if (config.texture.top) names.add(config.texture.top);
                if (config.texture.side) names.add(config.texture.side);
                if (config.texture.bottom) names.add(config.texture.bottom);
            }
        });

        return Array.from(names);
    }

    /**
     * Сканирует ItemRegistry и собирает все уникальные имена текстур предметов.
     */
    private collectRequiredItemTextureNames(): string[] {
        const names = new Set<string>();
        const items = ItemRegistry.getAll();

        items.forEach((config) => {
            if (config.texture) names.add(config.texture);
        });

        return Array.from(names);
    }

    public getAtlasTexture(): THREE.CanvasTexture | null {
        return this.atlasTexture;
    }

    public getItemAtlasTexture(): THREE.CanvasTexture | null {
        return this.itemAtlasTexture;
    }

    /**
     * Возвращает индекс слота в атласе для конкретной текстуры блока.
     */
    public getSlot(textureName: string): number {
        return this.mapping.get(textureName) ?? 0;
    }

    /**
     * Возвращает индекс слота в атласе для конкретной текстуры предмета.
     */
    public getItemSlot(textureName: string): number {
        return this.itemMapping.get(textureName) ?? 0;
    }

    public getSlotCount(): number {
        return this.slotCount;
    }

    public getItemSlotCount(): number {
        return this.itemSlotCount;
    }

    public getItemImage(textureName: string): HTMLImageElement | undefined {
        return this.itemImages.get(textureName);
    }
}
