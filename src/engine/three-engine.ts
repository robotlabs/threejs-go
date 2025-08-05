import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type App from "@/app/app";
import { LightManager } from "./light-manager";

import plane1VertexShader from "@/shaders/plane1.vertex.glsl";
import plane1FragmentShader from "@/shaders/plane1.fragment.glsl";

import planeSimpleVertexShader from "@/shaders/planeSimple.vertex.glsl";
import planeSimpleFragmentShader from "@/shaders/planeSimple.fragment.glsl";

import gsap from "gsap";

export default class ThreeEngine {
  private app: App;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private cube: THREE.Mesh;
  private lights: LightManager;

  private shaderPlane: THREE.Mesh;
  private shaderMaterial: THREE.ShaderMaterial;
  private shaderMaterialSimple: THREE.ShaderMaterial;

  constructor(app: App) {
    this.app = app;

    this.initThree();
    this.initLights();
    this.initGrid();
    this.initTestObject();
    this.initTestPlaneTexture();
    this.initTestPlaneShader();
    this.initSimpleShaderPlane();
    this.initControls();
  }

  private initThree(): void {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x222222);

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 5, 10);

    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2");

    if (gl) {
      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        canvas: canvas,
        context: gl,
      });
      console.log("Using WebGL 2");
    } else {
      // Fallback to WebGL 1
      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
      });
      console.warn("WebGL 2 not supported, using WebGL 1");
    }

    this.renderer.setSize(window.innerWidth, window.innerHeight, true);
    this.renderer.setClearColor(0x222222);
  }

  private initLights(): void {
    this.lights = new LightManager(this.scene);
  }

  private initControls(): void {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enabled = true;
  }

  initGrid() {
    const helper = new THREE.GridHelper(5000, 20);
    helper.position.y = -100;
    helper.material.opacity = 0.8;
    helper.material.transparent = true;
    this.scene.add(helper);
  }

  private initTestObject(): void {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({
      color: 0xe6b400,
      roughness: 0.5,
      metalness: 0.1,
    });

    for (let i = 0; i < 5000; i++) {
      this.cube = new THREE.Mesh(geometry, material);

      // if you want shadows:
      this.cube.castShadow = true;
      this.cube.receiveShadow = true;

      this.scene.add(this.cube);
      this.cube.position.set(
        Math.random() * 4 - Math.random() * 4,
        Math.random() * 4 - Math.random() * 4,
        Math.random() * 4 - Math.random() * 4 - 5
      );
      this.cube.rotation.set(
        Math.random() * 4 - Math.random() * 4,
        Math.random() * 4 - Math.random() * 4,
        Math.random() * 4 - Math.random() * 4
      );
      this.cube.scale.set(
        Math.random() * 1 - Math.random() * 1,
        Math.random() * 1 - Math.random() * 1,
        Math.random() * 1 - Math.random() * 1
      );

      gsap.to(this.cube.position, {
        x: Math.random() * 4 - Math.random() * 4,
        y: Math.random() * 4 - Math.random() * 4,
        z: Math.random() * 4 - Math.random() * 4 - 5,
        duration: 4,
        repeat: -1,
        yoyo: true,
        ease: "power4.inOut",
      });
      gsap.to(this.cube.rotation, {
        x: Math.random() * 4 - Math.random() * 4,
        y: Math.random() * 4 - Math.random() * 4,
        z: Math.random() * 4 - Math.random() * 4,
        duration: 4,
        repeat: -1,
        yoyo: true,
        ease: "power4.inOut",
      });
      gsap.to(this.cube.scale, {
        x: Math.random() * 2 - Math.random() * 2,
        y: Math.random() * 2 - Math.random() * 2,
        z: Math.random() * 2 - Math.random() * 2,
        duration: 4,
        repeat: -1,
        yoyo: true,
        ease: "power4.inOut",
      });
    }
    // this.cube = new THREE.Mesh(geometry, material);

    // // if you want shadows:
    // this.cube.castShadow = true;
    // this.cube.receiveShadow = true;

    // this.scene.add(this.cube);
  }

  private initTestPlaneTexture(): void {
    // Create plane geometry
    const geometry = new THREE.PlaneGeometry(5, 5); // 5x5 units

    // Create texture from preloaded image
    const texture = new THREE.Texture(this.app.assets["test-image-local"]);
    texture.needsUpdate = true; // Important: tell Three.js to update the texture

    // Optional: Set texture properties
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    // Create material with the texture
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      side: THREE.DoubleSide, // Make it visible from both sides
      transparent: true, // Enable transparency if your image has alpha
    });

    // Create the plane mesh
    const plane = new THREE.Mesh(geometry, material);

    // Position the plane
    plane.position.set(0, 0, 0); // Above the cubes
    // plane.rotation.x = -Math.PI / 4; // Tilt it slightly

    // Enable shadows if needed
    plane.castShadow = true;
    plane.receiveShadow = true;

    // Add to scene
    this.scene.add(plane);

    // Optional: Add some animation
    // gsap.to(plane.rotation, {
    //   z: Math.PI * 2,
    //   duration: 10,
    //   repeat: -1,
    //   ease: "none",
    // });
  }

  private initTestPlaneShader(): void {
    // Create plane geometry with more subdivisions for the wave effect
    const geometry = new THREE.PlaneGeometry(5, 5, 32, 32);

    // Create texture from preloaded image
    const texture = new THREE.Texture(this.app.assets["test-image-local"]);
    texture.needsUpdate = true;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    // Create shader material with external shaders
    this.shaderMaterial = new THREE.ShaderMaterial({
      vertexShader: plane1VertexShader,
      fragmentShader: plane1FragmentShader,
      uniforms: {
        uTime: { value: 0.0 },
        uResolution: {
          value: new THREE.Vector2(window.innerWidth, window.innerHeight),
        },
        uTexture: { value: texture },
      },
      side: THREE.DoubleSide,
      transparent: true,
    });

    // Create the plane mesh
    this.shaderPlane = new THREE.Mesh(geometry, this.shaderMaterial);

    // Position the plane
    this.shaderPlane.position.set(4, 0, 1);
    // this.shaderPlane.rotation.x = -Math.PI / 4;

    // Add to scene
    this.scene.add(this.shaderPlane);
  }

  private initSimpleShaderPlane(): void {
    // Create plane geometry with subdivisions for the wave effect
    const geometry = new THREE.PlaneGeometry(4, 4, 64, 64);

    // Create shader material (no texture needed!)
    this.shaderMaterialSimple = new THREE.ShaderMaterial({
      vertexShader: planeSimpleVertexShader,
      fragmentShader: planeSimpleFragmentShader,
      uniforms: {
        uTime: { value: 0.0 },
        uResolution: {
          value: new THREE.Vector2(window.innerWidth, window.innerHeight),
        },
      },
      side: THREE.DoubleSide,
      wireframe: false, // Set to true if you want to see the wireframe
    });

    // Create the plane mesh
    this.shaderPlane = new THREE.Mesh(geometry, this.shaderMaterialSimple);

    // Position the plane
    this.shaderPlane.position.set(-4, 0, 2); // Position it to the left of your cubes
    // this.shaderPlane.rotation.x = -Math.PI / 6; // Slight tilt

    // Add to scene
    this.scene.add(this.shaderPlane);
  }

  update(): void {
    if (this.controls) this.controls.update();
    if (this.cube) {
      this.cube.rotation.x += 0.01;
      this.cube.rotation.y += 0.01;
    }
    if (this.shaderMaterial) {
      this.shaderMaterial.uniforms.uTime.value = performance.now() * 0.01; // Convert to seconds
    }
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  resize(vw: number, vh: number): void {
    if (!this.renderer) return;
    this.camera.aspect = vw / vh;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(vw, vh, true);
    console.log("?", vw);
  }
}
