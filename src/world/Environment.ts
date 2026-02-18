import * as THREE from 'three';

export class Environment {
  private scene: THREE.Scene;
  private dirLight: THREE.DirectionalLight;
  private ambientLight: THREE.AmbientLight;

  private sun: THREE.Mesh;
  private moon: THREE.Mesh;
  private clouds: THREE.InstancedMesh;
  private cloudData: { x: number, y: number, z: number, scaleX: number, scaleZ: number }[] = [];
  private forceTimeSync: boolean = false;

  // Reusable object for cloud matrix updates (avoid GC)
  private cloudDummy: THREE.Object3D = new THREE.Object3D();

  // Cycle Configuration
  private time: number = 0; // Current time in seconds
  private readonly dayDuration: number = 600; // 10 minutes (600 seconds)
  private readonly nightDuration: number = 600; // 10 minutes
  private get totalCycleDuration() { return this.dayDuration + this.nightDuration; }

  // --- Environment States ---
  private readonly states = [
    { // 0: Midnight
      progress: 0.0,
      sky: new THREE.Color(0x020205),
      light: new THREE.Color(0x1a1a3a),
      lightIntensity: 0.1,
      ambientIntensity: 0.1,
    },
    { // 1: Sunrise
      progress: 0.25,
      sky: new THREE.Color(0xffa07a), // Light Salmon
      light: new THREE.Color(0xffccaa),
      lightIntensity: 0.6,
      ambientIntensity: 0.4,
    },
    { // 2: Midday
      progress: 0.5,
      sky: new THREE.Color(0x87ceeb), // Sky Blue
      light: new THREE.Color(0xffffff),
      lightIntensity: 1.2,
      ambientIntensity: 0.7,
    },
    { // 3: Sunset
      progress: 0.75,
      sky: new THREE.Color(0xff8c00), // Dark Orange
      light: new THREE.Color(0xffaa77),
      lightIntensity: 0.6,
      ambientIntensity: 0.4,
    },
    { // 4: Dusk/Night Start
      progress: 0.85,
      sky: new THREE.Color(0x101025), // Deep Midnight Blue
      light: new THREE.Color(0x1a1a3a),
      lightIntensity: 0.1,
      ambientIntensity: 0.15,
    },
    { // 5: Wrap back to Midnight
      progress: 1.0,
      sky: new THREE.Color(0x020205),
      light: new THREE.Color(0x1a1a3a),
      lightIntensity: 0.1,
      ambientIntensity: 0.1,
    }
  ];

  public get isDay(): boolean {
    const progress = this.time / this.totalCycleDuration;
    return progress > 0.22 && progress < 0.78;
  }

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 0 && window.innerWidth < 1024);

    // 1. Setup Lights
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(this.ambientLight);

    this.dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    this.dirLight.castShadow = true;

    // Optimize Shadows
    const shadowSize = isMobile ? 1024 : 4096; // 4K shadows on desktop
    this.dirLight.shadow.mapSize.width = shadowSize;
    this.dirLight.shadow.mapSize.height = shadowSize;
    this.dirLight.shadow.camera.near = 0.1;
    this.dirLight.shadow.camera.far = 200;
    this.dirLight.shadow.camera.left = -50;
    this.dirLight.shadow.camera.right = 50;
    this.dirLight.shadow.camera.top = 50;
    this.dirLight.shadow.camera.bottom = -50;
    this.dirLight.shadow.bias = -0.0002;
    this.dirLight.shadow.normalBias = 0.04;
    this.dirLight.shadow.radius = 3; // Blur radius for PCFShadowMap
    this.scene.add(this.dirLight);
    this.scene.add(this.dirLight.target);

    // 2. Setup Sun
    const sunGeo = new THREE.BoxGeometry(10, 10, 10);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffff00, fog: false });
    this.sun = new THREE.Mesh(sunGeo, sunMat);
    this.scene.add(this.sun);

    // 3. Setup Moon
    const moonGeo = new THREE.BoxGeometry(8, 8, 8);
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false }); // White moon
    this.moon = new THREE.Mesh(moonGeo, moonMat);
    this.scene.add(this.moon);

    // 4. Setup Clouds
    this.clouds = this.generateClouds();
    this.scene.add(this.clouds);

    // Initial start time (start at Noon)
    this.time = this.totalCycleDuration * 0.5;
  }

  private generateClouds(): THREE.InstancedMesh {
    const cloudCount = 50;
    const geometry = new THREE.BoxGeometry(16, 4, 16);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.4, // More transparent
      fog: false
    });

    const instancedMesh = new THREE.InstancedMesh(geometry, material, cloudCount);

    // Init Data
    for (let i = 0; i < cloudCount; i++) {
      this.cloudData.push({
        x: (Math.random() - 0.5) * 400,
        y: 100 + (Math.random() * 10),
        z: (Math.random() - 0.5) * 400,
        scaleX: 1 + Math.random() * 2,
        scaleZ: 1 + Math.random() * 2
      });
    }

    instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    instancedMesh.frustumCulled = false;
    return instancedMesh;
  }

  public setTimeToDay(instant: boolean = false) {
    this.time = this.totalCycleDuration * 0.5; // Midday
    if (instant) {
      this.forceTimeSync = true;
      // Synchronous update for instant change if needed (optional)
    }
  }

  public setTimeToNight(instant: boolean = false) {
    this.time = 0; // Midnight
    if (instant) this.forceTimeSync = true;
  }

  public setShadowsEnabled(enabled: boolean) {
    this.dirLight.castShadow = enabled;
  }

  public setCloudsEnabled(enabled: boolean) {
    this.clouds.visible = enabled;
  }

  public update(delta: number, playerPos: THREE.Vector3) {
    this.time += delta;
    if (this.time >= this.totalCycleDuration) {
      this.time %= this.totalCycleDuration;
    }

    // Calculate Cycle Progress (0.0 to 1.0)
    const progress = this.time / this.totalCycleDuration;

    const angle = (progress * Math.PI * 2) - (Math.PI / 2);
    const dist = 100;

    // Sun Position (Rotates around Z axis, rising from X)
    const sunX = Math.cos(angle) * dist;
    const sunY = Math.sin(angle) * dist;

    // Position celestial bodies relative to player so they don't disappear
    this.sun.position.set(playerPos.x + sunX, playerPos.y + sunY, playerPos.z);
    this.sun.lookAt(playerPos);

    // Moon is opposite
    this.moon.position.set(playerPos.x - sunX, playerPos.y - sunY, playerPos.z);
    this.moon.lookAt(playerPos);

    // --- Lighting Logic ---
    if (sunY > -10) {
      // Sun is up or setting

      // --- Shadow Texel Snapping ---
      // This prevents shadows from "jittering" when the player moves.
      // We snap the light position and target to the shadow map's grid.
      const shadowCam = this.dirLight.shadow.camera;
      const size = shadowCam.right - shadowCam.left;
      const texelSize = size / this.dirLight.shadow.mapSize.width;

      const snappedX = Math.floor(playerPos.x / texelSize) * texelSize;
      const snappedZ = Math.floor(playerPos.z / texelSize) * texelSize;

      this.dirLight.position.set(snappedX + sunX * 0.5, playerPos.y + sunY * 0.5, snappedZ);
      this.dirLight.target.position.set(snappedX, playerPos.y, snappedZ);

      this.dirLight.intensity = Math.max(0, Math.sin(angle));
    } else {
      // Night (Moon is up)
      this.dirLight.position.set(this.moon.position.x * 0.5, this.moon.position.y * 0.5, this.moon.position.z);
      this.dirLight.target.position.copy(playerPos);
      this.dirLight.intensity = Math.max(0, Math.sin(angle + Math.PI)) * 0.2;
    }

    // --- Color & Intensity Interpolation (Keyframe System) ---
    // 1. Find segment
    let startIdx = 0;
    for (let i = 0; i < this.states.length - 1; i++) {
      if (progress >= this.states[i].progress && progress <= this.states[i + 1].progress) {
        startIdx = i;
        break;
      }
    }
    const endIdx = startIdx + 1;
    const s1 = this.states[startIdx];
    const s2 = this.states[endIdx];

    // 2. Calculate local t (0..1)
    const segmentDuration = s2.progress - s1.progress;
    const localT = segmentDuration > 0 ? (progress - s1.progress) / segmentDuration : 0;

    // We use a separate lerp factor for the "target" properties to maintain smooth visual flow
    // or respect forceTimeSync
    const lerpFactor = this.forceTimeSync ? 1.0 : Math.min(1.0, delta * 2.0);

    // 3. Interpolate values
    const targetSky = new THREE.Color().copy(s1.sky).lerp(s2.sky, localT);
    const targetLight = new THREE.Color().copy(s1.light).lerp(s2.light, localT);
    const targetLightIntensity = THREE.MathUtils.lerp(s1.lightIntensity, s2.lightIntensity, localT);
    const targetAmbientIntensity = THREE.MathUtils.lerp(s1.ambientIntensity, s2.ambientIntensity, localT);

    // 4. Apply to scene
    this.scene.background = (this.scene.background as THREE.Color).lerp(targetSky, lerpFactor);
    if (this.scene.fog) {
      (this.scene.fog as THREE.Fog).color.lerp(targetSky, lerpFactor);
      // Dynamic fog distance (more fog at night/sunset)
      const targetFogFar = sunY > 10 ? 100 : 60;
      (this.scene.fog as THREE.Fog).far = THREE.MathUtils.lerp((this.scene.fog as THREE.Fog).far, targetFogFar, lerpFactor);
    }

    this.dirLight.color.lerp(targetLight, lerpFactor);
    this.dirLight.intensity = THREE.MathUtils.lerp(this.dirLight.intensity, targetLightIntensity, lerpFactor);
    this.ambientLight.intensity = THREE.MathUtils.lerp(this.ambientLight.intensity, targetAmbientIntensity, lerpFactor);

    if (this.forceTimeSync && lerpFactor >= 1.0) {
      this.forceTimeSync = false;
    }

    // --- Clouds ---
    const dummy = this.cloudDummy;
    const range = 200; // Radius around player
    const cloudSpeed = 2;

    this.cloudData.forEach((data, i) => {
      // Calculate wrapped position relative to player
      // We use data.x as the "offset from origin" at time 0
      // currentGlobalX = data.x + this.time * cloudSpeed;

      const globalX = data.x + this.time * cloudSpeed;
      const globalZ = data.z; // Z doesn't move with time, just wraps

      // Wrap logic:
      // Relative to player:
      const dx = globalX - playerPos.x;
      const dz = globalZ - playerPos.z;

      // Modulo to keep within [-range, range]
      // ((val % size) + size) % size -> gives [0, size]
      // We want [-range, range], so we shift
      const size = range * 2;

      const wrappedDx = ((dx % size) + size) % size - range;
      const wrappedDz = ((dz % size) + size) % size - range;

      dummy.position.set(
        playerPos.x + wrappedDx,
        data.y,
        playerPos.z + wrappedDz
      );

      dummy.scale.set(data.scaleX, 1, data.scaleZ);
      dummy.updateMatrix();
      this.clouds.setMatrixAt(i, dummy.matrix);
    });

    this.clouds.instanceMatrix.needsUpdate = true;
  }
}

