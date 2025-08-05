// File: @/engine/tsl-plane.ts
import * as THREE from "three";
import * as WEBGPU from "three/webgpu";

const {
  MeshPhysicalNodeMaterial,
  uniform,
  varying,
  attribute,
  add,
  mul,
  sin,
  cos,
  length,
  normalize,
  dot,
  mix,
  smoothstep,
  clamp,
  positionLocal,
  normalLocal,
  uv,
  timerLocal,
  vec3,
  vec4,
  float,
  texture,
  sampler,
} = THREE as any; // Cast perché i types TSL potrebbero non essere completi

export interface TSLPlaneParams {
  width?: number;
  height?: number;
  widthSegments?: number;
  heightSegments?: number;
  position?: THREE.Vector3;
}

export class TSLPlane {
  private geometry: THREE.PlaneGeometry;
  private material: any; // MeshPhysicalNodeMaterial
  public mesh: THREE.Mesh;

  // Uniforms controllabili
  private timeSpeedUniform: any;
  private amplitudeUniform: any;
  private colorMixUniform: any;
  private waveFrequencyUniform: any;
  private metalnessUniform: any;
  private roughnessUniform: any;
  private textureUniform: any;

  constructor(params: TSLPlaneParams = {}) {
    const {
      width = 5,
      height = 5,
      widthSegments = 64,
      heightSegments = 64,
      position = new THREE.Vector3(0, 0, 0),
    } = params;

    this.initGeometry(width, height, widthSegments, heightSegments);
    this.initMaterial();
    this.initMesh(position);
  }

  private initGeometry(
    width: number,
    height: number,
    widthSegments: number,
    heightSegments: number
  ): void {
    this.geometry = new THREE.PlaneGeometry(
      width,
      height,
      widthSegments,
      heightSegments
    );
  }

  private initMaterial(): void {
    // Check if TSL is available (Three.js r168+)
    if (!MeshPhysicalNodeMaterial) {
      console.error("TSL not available! Using fallback ShaderMaterial");
      this.createFallbackMaterial();
      return;
    }

    // Create uniforms
    this.timeSpeedUniform = uniform(1.0);
    this.amplitudeUniform = uniform(0.3);
    this.colorMixUniform = uniform(0.5);
    this.waveFrequencyUniform = uniform(2.0);
    this.metalnessUniform = uniform(0.1);
    this.roughnessUniform = uniform(0.8);
    this.textureUniform = uniform(null);

    // Create TSL material
    this.material = new MeshPhysicalNodeMaterial();

    // Vertex displacement
    const time = mul(timerLocal(), this.timeSpeedUniform);
    const waveX = sin(
      add(mul(positionLocal.x, this.waveFrequencyUniform), time)
    );
    const waveZ = cos(
      add(mul(positionLocal.z, this.waveFrequencyUniform), mul(time, 0.7))
    );
    const displacement = mul(
      mul(add(waveX, waveZ), this.amplitudeUniform),
      0.5
    );

    const newPosition = add(positionLocal, mul(normalLocal, displacement));
    this.material.positionNode = newPosition;

    // Color animation
    const color1 = vec3(0.2, 0.8, 1.0); // Cyan
    const color2 = vec3(1.0, 0.3, 0.6); // Pink
    const color3 = vec3(0.9, 0.9, 0.2); // Yellow

    const colorPhase1 = sin(add(mul(length(positionLocal.xz), 1.5), time));
    const colorPhase2 = cos(add(mul(positionLocal.y, 2.0), mul(time, 0.5)));

    const mixedColor12 = mix(color1, color2, smoothstep(-1, 1, colorPhase1));
    const finalAnimatedColor = mix(
      mixedColor12,
      color3,
      smoothstep(-1, 1, colorPhase2)
    );

    // Base texture color (if available)
    let baseColor = vec3(0.7, 0.7, 0.8);

    // If texture is provided, use it
    // Note: texture TSL node syntax might vary
    // baseColor = texture(this.textureUniform, uv());

    const finalColor = mix(baseColor, finalAnimatedColor, this.colorMixUniform);

    this.material.colorNode = finalColor;
    this.material.metalnessNode = this.metalnessUniform;
    this.material.roughnessNode = this.roughnessUniform;

    // Enable transparency for better effects
    this.material.transparent = true;
    this.material.side = THREE.DoubleSide;
  }

  private createFallbackMaterial(): void {
    // Fallback to regular ShaderMaterial if TSL not available
    this.material = new THREE.ShaderMaterial({
      vertexShader: `
        uniform float uTime;
        uniform float uAmplitude;
        uniform float uWaveFreq;
        varying vec2 vUv;
        varying vec3 vPosition;
        
        void main() {
          vUv = uv;
          vPosition = position;
          
          vec3 pos = position;
          float waveX = sin(pos.x * uWaveFreq + uTime);
          float waveZ = cos(pos.z * uWaveFreq + uTime * 0.7);
          pos.y += (waveX + waveZ) * uAmplitude * 0.5;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uColorMix;
        uniform float uMetalness;
        uniform float uRoughness;
        varying vec2 vUv;
        varying vec3 vPosition;
        
        void main() {
          vec3 color1 = vec3(0.2, 0.8, 1.0);
          vec3 color2 = vec3(1.0, 0.3, 0.6);
          vec3 color3 = vec3(0.9, 0.9, 0.2);
          
          float phase1 = sin(length(vPosition.xz) * 1.5 + uTime);
          float phase2 = cos(vPosition.y * 2.0 + uTime * 0.5);
          
          vec3 mixedColor = mix(color1, color2, smoothstep(-1.0, 1.0, phase1));
          vec3 finalColor = mix(mixedColor, color3, smoothstep(-1.0, 1.0, phase2));
          
          vec3 baseColor = vec3(0.7, 0.7, 0.8);
          vec3 result = mix(baseColor, finalColor, uColorMix);
          
          gl_FragColor = vec4(result, 1.0);
        }
      `,
      uniforms: {
        uTime: { value: 0.0 },
        uAmplitude: { value: 0.3 },
        uColorMix: { value: 0.5 },
        uWaveFreq: { value: 2.0 },
        uMetalness: { value: 0.1 },
        uRoughness: { value: 0.8 },
      },
      side: THREE.DoubleSide,
      transparent: true,
    });
  }

  private initMesh(position: THREE.Vector3): void {
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.position.copy(position);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
  }

  // Getters for GUI controls
  get timeSpeed(): number {
    return (
      this.timeSpeedUniform?.value ??
      this.material.uniforms?.uTime?.value ??
      1.0
    );
  }

  set timeSpeed(value: number) {
    if (this.timeSpeedUniform) {
      this.timeSpeedUniform.value = value;
    } else if (this.material.uniforms?.uTime) {
      // For fallback material, we'll handle time in update method
    }
  }

  get amplitude(): number {
    return (
      this.amplitudeUniform?.value ??
      this.material.uniforms?.uAmplitude?.value ??
      0.3
    );
  }

  set amplitude(value: number) {
    if (this.amplitudeUniform) {
      this.amplitudeUniform.value = value;
    } else if (this.material.uniforms?.uAmplitude) {
      this.material.uniforms.uAmplitude.value = value;
    }
  }

  get colorMix(): number {
    return (
      this.colorMixUniform?.value ??
      this.material.uniforms?.uColorMix?.value ??
      0.5
    );
  }

  set colorMix(value: number) {
    if (this.colorMixUniform) {
      this.colorMixUniform.value = value;
    } else if (this.material.uniforms?.uColorMix) {
      this.material.uniforms.uColorMix.value = value;
    }
  }

  get waveFrequency(): number {
    return (
      this.waveFrequencyUniform?.value ??
      this.material.uniforms?.uWaveFreq?.value ??
      2.0
    );
  }

  set waveFrequency(value: number) {
    if (this.waveFrequencyUniform) {
      this.waveFrequencyUniform.value = value;
    } else if (this.material.uniforms?.uWaveFreq) {
      this.material.uniforms.uWaveFreq.value = value;
    }
  }

  get metalness(): number {
    return (
      this.metalnessUniform?.value ??
      this.material.uniforms?.uMetalness?.value ??
      0.1
    );
  }

  set metalness(value: number) {
    if (this.metalnessUniform) {
      this.metalnessUniform.value = value;
    } else if (this.material.uniforms?.uMetalness) {
      this.material.uniforms.uMetalness.value = value;
    }
  }

  get roughness(): number {
    return (
      this.roughnessUniform?.value ??
      this.material.uniforms?.uRoughness?.value ??
      0.8
    );
  }

  set roughness(value: number) {
    if (this.roughnessUniform) {
      this.roughnessUniform.value = value;
    } else if (this.material.uniforms?.uRoughness) {
      this.material.uniforms.uRoughness.value = value;
    }
  }

  // Set texture (TSL or fallback)
  setTexture(texture: THREE.Texture | null): void {
    if (this.textureUniform) {
      this.textureUniform.value = texture;
    }
    // For fallback material, you'd need to add texture support manually
  }

  // Update method for fallback material time uniform
  update(time: number): void {
    if (this.material.uniforms?.uTime) {
      this.material.uniforms.uTime.value = time * 0.001;
    }
  }

  // Clean up
  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
