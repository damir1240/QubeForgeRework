import * as THREE from "three";
import { VoxelTextureManager } from "../core/assets/VoxelTextureManager";
import { BlockRegistry, ItemRegistry } from "../modding/Registry";
import { BLOCK } from "../constants/Blocks";

export class ItemMeshFactory {
    /**
     * Creates a 3D mesh for an item or block based on its ID.
     */
    public static createMesh(id: number, atlasTexture?: THREE.Texture): THREE.Mesh | null {
        if (id === 0) return null;

        const itemConfig = ItemRegistry.getById(id);
        const blockConfig = BlockRegistry.getById(id);

        if (itemConfig) {
            return this.createItemMesh(id);
        } else if (blockConfig) {
            return this.createBlockMesh(id, atlasTexture);
        }

        return null;
    }

    /**
     * Creates a 16x16 pixel-based extruded mesh from a PNG texture.
     */
    public static createItemMesh(id: number): THREE.Mesh | null {
        const itemConfig = ItemRegistry.getById(id);
        if (!itemConfig) return null;

        const textureManager = VoxelTextureManager.getInstance();
        const image = textureManager.getItemImage(itemConfig.texture);
        if (!image) return null;

        const canvas = document.createElement('canvas');
        canvas.width = 16;
        canvas.height = 16;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(image, 0, 0, 16, 16);
        const data = ctx.getImageData(0, 0, 16, 16).data;

        const positions: number[] = [];
        const normals: number[] = [];
        const colors: number[] = [];
        const uvs: number[] = [];

        const size = 16;
        const scale = 0.04;
        const pixelSize = scale;
        const depth = pixelSize;

        const pushVertex = (x: number, y: number, z: number, nx: number, ny: number, nz: number, r: number, g: number, b: number) => {
            positions.push(x, y, z);
            normals.push(nx, ny, nz);
            colors.push(r, g, b);
            uvs.push(0, 0);
        };

        const addFace = (x: number, y: number, z: number, w: number, h: number, d: number, nx: number, ny: number, nz: number, r: number, g: number, b: number) => {
            const x1 = x + w, y1 = y + h, z1 = z + d;
            let p0, p1, p2, p3;

            if (nx === 1) { p0 = [x1, y, z1]; p1 = [x1, y, z]; p2 = [x1, y1, z1]; p3 = [x1, y1, z]; }
            else if (nx === -1) { p0 = [x, y, z]; p1 = [x, y, z1]; p2 = [x, y1, z]; p3 = [x, y1, z1]; }
            else if (ny === 1) { p0 = [x, y1, z1]; p1 = [x1, y1, z1]; p2 = [x, y1, z]; p3 = [x1, y1, z]; }
            else if (ny === -1) { p0 = [x, y, z]; p1 = [x1, y, z]; p2 = [x, y, z1]; p3 = [x1, y, z1]; }
            else if (nz === 1) { p0 = [x, y, z1]; p1 = [x1, y, z1]; p2 = [x, y1, z1]; p3 = [x1, y1, z1]; }
            else { p0 = [x1, y, z]; p1 = [x, y, z]; p2 = [x1, y1, z]; p3 = [x, y1, z]; }

            pushVertex(p0[0], p0[1], p0[2], nx, ny, nz, r, g, b);
            pushVertex(p1[0], p1[1], p1[2], nx, ny, nz, r, g, b);
            pushVertex(p2[0], p2[1], p2[2], nx, ny, nz, r, g, b);
            pushVertex(p2[0], p2[1], p2[2], nx, ny, nz, r, g, b);
            pushVertex(p1[0], p1[1], p1[2], nx, ny, nz, r, g, b);
            pushVertex(p3[0], p3[1], p3[2], nx, ny, nz, r, g, b);
        };

        const offsetX = -(size * pixelSize) / 2;
        const offsetY = -(size * pixelSize) / 2;

        const isOpaque = (tx: number, ty: number) => {
            if (tx < 0 || tx >= 16 || ty < 0 || ty >= 16) return false;
            return data[(ty * 16 + tx) * 4 + 3] > 0;
        };

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const idx = (y * 16 + x) * 4;
                const a = data[idx + 3];
                if (a === 0) continue;

                const r = data[idx] / 255;
                const g = data[idx + 1] / 255;
                const b = data[idx + 2] / 255;

                const px = offsetX + x * pixelSize;
                const py = offsetY + (size - 1 - y) * pixelSize;
                const pz = -depth / 2;

                if (!isOpaque(x + 1, y)) addFace(px, py, pz, pixelSize, pixelSize, depth, 1, 0, 0, r, g, b);
                if (!isOpaque(x - 1, y)) addFace(px, py, pz, pixelSize, pixelSize, depth, -1, 0, 0, r, g, b);
                if (!isOpaque(x, y - 1)) addFace(px, py, pz, pixelSize, pixelSize, depth, 0, 1, 0, r, g, b);
                if (!isOpaque(x, y + 1)) addFace(px, py, pz, pixelSize, pixelSize, depth, 0, -1, 0, r, g, b);

                addFace(px, py, pz, pixelSize, pixelSize, depth, 0, 0, 1, r, g, b);
                addFace(px, py, pz, pixelSize, pixelSize, depth, 0, 0, -1, r, g, b);
            }
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
        geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
        geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
        geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));

        const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.y = Math.PI / 2;

        const edges = new THREE.EdgesGeometry(geo);
        const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 1 }));
        mesh.add(line);

        if (id === BLOCK.BROKEN_COMPASS) {
            const needleGeo = new THREE.BoxGeometry(0.1, 0.4, 0.05);
            const needleMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
            const needleMesh = new THREE.Mesh(needleGeo, needleMat);
            needleMesh.position.set(0, 0, -0.1);
            needleMesh.name = "needle";
            mesh.add(needleMesh);
        }

        return mesh;
    }

    /**
     * Creates a simple cube mesh for a block with proper UV mapping from the atlas.
     */
    public static createBlockMesh(id: number, atlasTexture?: THREE.Texture): THREE.Mesh | null {
        const config = BlockRegistry.getById(id);
        if (!config) return null;

        const geo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
        const textureManager = VoxelTextureManager.getInstance();
        const slotCount = textureManager.getSlotCount() || 1;
        const uvStep = 1.0 / slotCount;
        const uvInset = 0.001;

        const getRange = (idx: number) => {
            return {
                min: idx * uvStep + uvInset,
                max: (idx + 1) * uvStep - uvInset,
            };
        };

        const uvAttr = geo.attributes.uv;

        // Faces: 0:Right, 1:Left, 2:Top, 3:Bottom, 4:Front, 5:Back
        for (let face = 0; face < 6; face++) {
            let textureName: string = '';
            if (config.texture) {
                if (typeof config.texture === 'string') {
                    textureName = config.texture;
                } else {
                    if (face === 2) textureName = config.texture.top;
                    else if (face === 3) textureName = config.texture.bottom;
                    else textureName = config.texture.side;

                    if (id === BLOCK.FURNACE && face === 4) textureName = config.texture.side; // Assuming side is also used for front if not specialized
                }
            }

            const texIdx = textureManager.getSlot(textureName);
            const { min, max } = getRange(texIdx);
            const offset = face * 4;
            for (let i = 0; i < 4; i++) {
                const u = uvAttr.getX(offset + i);
                uvAttr.setX(offset + i, min + u * (max - min));
            }
        }
        uvAttr.needsUpdate = true;

        // Colors (mostly 1,1,1 for textured blocks)
        const colors: number[] = [];
        for (let i = 0; i < 24; i++) {
            colors.push(1, 1, 1);
        }
        geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

        const mat = new THREE.MeshStandardMaterial({
            map: atlasTexture || textureManager.getAtlasTexture(),
            vertexColors: true,
            roughness: 0.8,
            alphaTest: 0.5,
            transparent: true,
        });

        const mesh = new THREE.Mesh(geo, mat);
        return mesh;
    }
}
