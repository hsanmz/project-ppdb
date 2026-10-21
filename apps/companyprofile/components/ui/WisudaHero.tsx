import { useRef, useEffect, useState } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

interface WisudaHeroProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}

/**
 * WisudaHero — tampilan 3D model wisudawan (graduate.glb).
 *
 * graduate.glb: 7.19 MB, statis (tanpa rig/animasi), lebih ringan dari
 * wisudawan-3d.glb (13.17 MB). Model ini menggunakan kompresi Draco.
 *
 * Model secara otomatis di-center berdasarkan bounding box dan discale
 * agar muat dalam kamera hero (orthographic [0,0,9], zoom 150).
 *
 * Model ini STATIS — tidak ada animasi walk-cycle seperti komponen Courier lama.
 * Jika ingin gerakan, tambahkan animasi kamera atau ganti ke model yang punya rig.
 *
 * Kode Courier lama tetap ada di orbit-delivery-hero.tsx (tidak dihapus)
 * sehingga bisa dikembalikan kapan saja jika diperlukan.
 */
export function WisudaHero({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
}: WisudaHeroProps) {
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const groupRef = useRef<THREE.Group>(null);
  const gltfSceneRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadModel = async () => {
      try {
        const res = await fetch('/models/graduate.glb');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const arrayBuffer = await res.arrayBuffer();

        if (cancelled) return;

        const loader = new GLTFLoader();
        const draco = new DRACOLoader();
        draco.setDecoderPath('/draco/');
        loader.setDRACOLoader(draco);

        const gltf = await loader.parseAsync(arrayBuffer, '/models/');
        if (cancelled) return;

        // Auto-center model berdasarkan bounding box agar penuh terlihat kamera
        const box = new THREE.Box3().setFromObject(gltf.scene);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);

        // Pindahkan scene ke dalam group dengan offset -center agar model berada di origin
        gltf.scene.position.sub(center);
        // Skala agar dimensi terbesar ~2 unit (cukup untuk kamera zoom 150)
        const autoScale = maxDim > 0 ? 2 / maxDim : 1;
        gltf.scene.scale.setScalar(autoScale);

        gltfSceneRef.current = gltf.scene as THREE.Group;
        setLoaded(true);
        console.log('[WisudaHero] model loaded & centered, size:', size, 'autoScale:', autoScale);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        console.error('[WisudaHero] load failed:', e);
      }
    };

    loadModel();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!groupRef.current || !gltfSceneRef.current) return;
    groupRef.current.position.set(...position);
    groupRef.current.rotation.set(...rotation);
    groupRef.current.scale.set(scale, scale, scale);
  }, [position, rotation, scale]);

  if (error) {
    console.error('[WisudaHero] error state:', error);
    return null;
  }
  if (!gltfSceneRef.current) return null;

  return (
    <group ref={groupRef}>
      <primitive object={gltfSceneRef.current} dispose={null} />
    </group>
  );
}
