import {
  ACESFilmicToneMapping,
  BoxGeometry,
  Color,
  CylinderGeometry, DoubleSide,
  FloatType,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial, PCFSoftShadowMap,
  PerspectiveCamera,
  PMREMGenerator, PointLight,
  Scene, SphereGeometry,
  sRGBEncoding,
  TextureLoader,
  Vector2,
  WebGLRenderer
} from "three";
import {RGBELoader} from "three/examples/jsm/loaders/RGBELoader.js";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import {mergeBufferGeometries} from "three/examples/jsm/utils/BufferGeometryUtils";
import SimplexNoise from 'https://cdn.skypack.dev/simplex-noise@3.0.0';


const scene = new Scene();
scene.background = new Color('#ffeecc');

const camera = new PerspectiveCamera(
  45,
  innerWidth / innerHeight,
  0.1,
  1000
);

camera.position.set(-17, 31, 33);

const renderer = new WebGLRenderer({
  antialias: true,
});
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = ACESFilmicToneMapping;
renderer.outputEncoding = sRGBEncoding;
renderer.physicallyCorrectLights = true;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const light = new PointLight(new Color("FFCB8E").convertLinearToSRGB(), 80, 200);
light.position.set(10, 20, 10);

light.castShadow = true;
light.shadow.mapSize.width = 512;
light.shadow.mapSize.height = 512;
light.shadow.camera.near= 0.5;
light.shadow.camera.far = 500;
scene.add(light);


const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
controls.dampingFactor = 0.05;
controls.enableDamping = true;

let envmap;
const MAX_HEIGHT = 10;

const STONE_HEIGHT = MAX_HEIGHT * 0.8;
const DIRT_HEIGHT = MAX_HEIGHT * 0.7;
const GRASS_HEIGHT = MAX_HEIGHT * 0.5;
const SAND_HEIGHT = MAX_HEIGHT * 0.3;
const DIRT2_HEIGHT = 0;

async function animate() {

  const pmrem = new PMREMGenerator(renderer); //для map
  const envmapTexture = await new RGBELoader()
    .setDataType(FloatType)
    .loadAsync('assets/envmap.hdr');
  envmap = pmrem.fromEquirectangular(envmapTexture).texture;

  const textures = {
    dirt: await new TextureLoader().loadAsync("assets/dirt.png"),
    dirt2: await new TextureLoader().loadAsync("assets/dirt2.jpg"),
    grass: await new TextureLoader().loadAsync("assets/grass.jpg"),
    sand: await new TextureLoader().loadAsync("assets/sand.jpg"),
    water: await new TextureLoader().loadAsync("assets/water.jpg"),
    stone: await new TextureLoader().loadAsync("assets/stone.png"),
  };

  const simplex = new SimplexNoise();

  for (let i = -15; i <= 15; i++) {
    for (let j = -15; j <= 15; j++) {
      let position = titleToPosition(i, j);

      if (position.length() > 16) continue;

      //разную высоту цилиндров
      let noise = (simplex.noise2D(i * 0.1, j * 0.1) + 1) * 0.5;
      //i * 0.1, j * 0.1 - от -1 до 1
      noise = Math.pow(noise, 1.5);

      makeHex(noise * MAX_HEIGHT, titleToPosition(i, j));
    }
  }

  const stoneMesh = hexMesh(stoneGeo, textures.stone);
  const grassMesh = hexMesh(grassGeo, textures.grass);
  const dirt2Mesh = hexMesh(dirt2Geo, textures.dirt2);
  const dirtMesh = hexMesh(dirtGeo, textures.dirt);
  const sandMesh = hexMesh(sandGeo, textures.sand);

  scene.add(stoneMesh, grassMesh, dirt2Mesh, dirtMesh, sandMesh);

  const seaMesh = new Mesh(
    new CylinderGeometry(17, 17, MAX_HEIGHT * 0.2, 50),
    new MeshPhysicalMaterial({
      envMap: envmap,
      color: new Color('#55aaff').convertSRGBToLinear().multiplyScalar(3),
      ior: 1.4,
      transmission: 1,
      transparent: true,
      thickness: 1.5,
      envMapIntensity: 0.2,
      roughness: 1,
      metalness: 0.025,
      roughnessMap: textures.water,
      metalnessMap: textures.water
    })
  );
  seaMesh.receiveShadow = true;
  seaMesh.position.set(0, MAX_HEIGHT * 0.1, 0);
  scene.add(seaMesh);

  const mapFloor = new Mesh(
    new CylinderGeometry(
      18.5,
      18.5,
      MAX_HEIGHT * 0.1,
      50,
    ),
    new MeshPhysicalMaterial({
      envMap: envmap,
      map: textures.dirt2,
      envMapIntensity: 0.1,
      side: DoubleSide
    })
  );
  mapFloor.receiveShadow = true;
  mapFloor.position.set(0, -MAX_HEIGHT * 0.05, 0);
  scene.add(mapFloor);

  clouds();

  const mapContainer = new Mesh(
    new CylinderGeometry(
      17.1,
      17.1,
      MAX_HEIGHT * 0.25,
      50,
      1,
      true
    ),
    new MeshPhysicalMaterial({
      envMap: envmap,
      map: textures.dirt,
      envMapIntensity: 0.2,
      side: DoubleSide
    })
  );
  mapContainer.receiveShadow = true;
  mapContainer.position.set(0, MAX_HEIGHT * 0.125, 0);
  scene.add(mapContainer);

  renderer.setAnimationLoop(() => {
    controls.update();
    renderer.render(scene, camera);
  })
}

animate();

function titleToPosition(titleX, titleY) {
  return new Vector2(
    (titleX + (titleY % 2) * 0.5) * 1.77,
    titleY * 1.535
  );
}

let stoneGeo = new BoxGeometry(0, 0, 0);
let dirtGeo = new BoxGeometry(0, 0, 0);
let dirt2Geo = new BoxGeometry(0, 0, 0);
let sandGeo = new BoxGeometry(0, 0, 0);
let grassGeo = new BoxGeometry(0, 0, 0);

function hexGeometry(height, position) {
  const geo = new CylinderGeometry(
    1,
    1,
    height,
    6,
    1,
    false
  );
  geo.translate(position.x, height * 0.5, position.y);

  return geo;
}

function makeHex(height, position) {
  //высота цилиндров
  const geo = hexGeometry(height, position);

  if (height > STONE_HEIGHT) {
    stoneGeo = mergeBufferGeometries([geo, stoneGeo]);

    if (Math.random() > 0.7) {
      stoneGeo = mergeBufferGeometries([stoneGeo, stone(height, position)]);
    }

  } else if ( height > DIRT_HEIGHT) {
    dirtGeo = mergeBufferGeometries([geo, dirtGeo]);

    if (Math.random() > 0.7) {
      grassGeo = mergeBufferGeometries([grassGeo, tree(height, position)]);
    }

  } else if ( height > GRASS_HEIGHT) {
    grassGeo = mergeBufferGeometries([geo, grassGeo]);
  } else if ( height > SAND_HEIGHT) {
    sandGeo = mergeBufferGeometries([geo, sandGeo]);

    if (Math.random() > 0.7 && stoneGeo) {
      stoneGeo = mergeBufferGeometries([stoneGeo, stone(height, position)]);
    }

  } else if ( height > DIRT2_HEIGHT) {
    dirt2Geo = mergeBufferGeometries([geo, dirt2Geo]);
  }
}

function hexMesh(geo, map) {
  const mat = new MeshPhysicalMaterial({
    envMap: envmap,
    envMapIntensity: 0.135,
    flatShading: true,
    map,
  });

  const mesh = new Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  return mesh;
}

function stone(height, position) {
  const px = Math.random() * 0.4;
  const pz = Math.random() * 0.4;

  const geo = new SphereGeometry(
    Math.random() * 0.3 + 0.1,
    7,
    7
  );
  geo.translate(position.x + px, height, position.y + pz);

  return geo;
}

function tree(height, position) {
  //ёлочки
  const threeHeight = Math.random() + 1.25;

  const geo = new CylinderGeometry(0, 1.5, threeHeight, 3);
  geo.translate(position.x , height + 1, position.y);

  const geo2 = new CylinderGeometry(0, 1.15, threeHeight, 3);
  geo2.translate(position.x , height + threeHeight * 0.6 + 1, position.y);

  const geo3 = new CylinderGeometry(0, 0.8, threeHeight, 3);
  geo3.translate(position.x , height + threeHeight * 1.25 + 1, position.y);

  return mergeBufferGeometries([geo, geo2, geo3]);
}

function clouds() {
  let geo = new SphereGeometry(0, 0, 0);
  let count = Math.floor(Math.pow(Math.random(), 0.45) * 4);

  for(let i = 0; i < count; i++) {
    const puff1 = new SphereGeometry(1.2, 7, 7);
    const puff2 = new SphereGeometry(1.5, 7, 7);
    const puff3 = new SphereGeometry(0.9, 7, 7);

    puff1.translate(-1.85, Math.random() * 0.3, 0);
    puff2.translate(0,     Math.random() * 0.3, 0);
    puff3.translate(1.85,  Math.random() * 0.3, 0);

    const cloudGeo = mergeBufferGeometries([puff1, puff2, puff3]);
    cloudGeo.translate(
      Math.random() * 20 - 10,
      Math.random() * 8 + 8,
      Math.random() * 20 - 10
    );
    cloudGeo.rotateY(Math.random() * Math.PI * 2);

    geo = mergeBufferGeometries([geo, cloudGeo]);
  }

  const mesh = new Mesh(
    geo,
    new MeshStandardMaterial({
      envMap: envmap,
      envMapIntensity: 0.75,
      flatShading: true,
      // transparent: true,
      // opacity: 0.85,
    })
  );

  scene.add(mesh);
}