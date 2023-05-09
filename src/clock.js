import {
  Mesh,
  MeshStandardMaterial,
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  ACESFilmicToneMapping,
  sRGBEncoding,
  Color,
  PMREMGenerator,
  SphereBufferGeometry,
  RingGeometry,
  DoubleSide,
  CylinderBufferGeometry,
  Group,
  Vector2,
  BoxBufferGeometry, Matrix4, Euler, Vector3, Line
} from "three";
import {RGBELoader} from 'three/examples/jsm/loaders/RGBELoader.js'
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";

const scene = new Scene();
scene.background = new Color('white');

const camera = new PerspectiveCamera(
  45,
  innerWidth / innerHeight,
  0.1,
  1000
);
camera.position.set(0,0, 10);

const render = new WebGLRenderer({
  antialias: true
});
render.setSize(innerWidth, innerHeight);
render.toneMapping = ACESFilmicToneMapping;
render.outputEncoding = sRGBEncoding;
document.body.appendChild(render.domElement);

const controls = new OrbitControls(camera, render.domElement);
controls.target.set(0,0,0);

const pmrem = new PMREMGenerator(render);
pmrem.compileEquirectangularShader();

//отслеживае мышку
const mousePos = new Vector2(0, 0);

window.addEventListener('mousemove', (e) => {
  let x = e.clientX - innerWidth * 0.5;
  let y = e.clientY - innerHeight * 0.5;

  mousePos.x = x * 0.001;
  mousePos.y = y * 0.001;
})


async function init () {

  const envHdrTexture = await new RGBELoader().loadAsync(
    './../assets/cannon_1k_blurred.hdr'
  );
  const envRT = pmrem.fromEquirectangular(envHdrTexture);

  //круги
  const ring1 = CustomRing(envRT, 0.65, 'white');
  ring1.scale.set(0.75, 0.75);
  scene.add(ring1);

  const ring2 = CustomRing(envRT, 0.35,
    new Color(0.25, 0.225, 0.215)
  );
  ring2.scale.set(1.05, 1.05);
  scene.add(ring2);

  const ring3 = CustomRing(envRT, 0.15,
    new Color(0.7, 0.7, 0.7)
  );
  ring3.scale.set(1.3, 1.3);
  scene.add(ring3);


  //lines
  const hourLine = CustomLine(
    0.4,
    0.135,
    0.07, envRT,
    'white',
    3
  );
  scene.add(hourLine);

  const minuteLine = CustomLine(
    0.8,
    0.135,
    0.07,
    envRT,
    new Color(0.4, 0.4, 0.4),
    1
  );
  scene.add(minuteLine);

  const secondLine = CustomLine(
    1,
    0.075,
    0.07,
    envRT,
    new Color(0.2, 0.2, 0.2),
    1
  );
  scene.add(secondLine);

  const cLines = clockLines(envRT);
  scene.add(cLines);

  render.setAnimationLoop(() => {

    ring1.rotation.x = ring1.rotation.x * 0.95 + (mousePos.y * 1.2) * 0.05;
    ring1.rotation.y = ring1.rotation.y * 0.95 + (mousePos.x * 1.2) * 0.05;

    ring2.rotation.x = ring2.rotation.x * 0.95 + (mousePos.y * 0.4) * 0.05;
    ring2.rotation.y = ring2.rotation.y * 0.95 + (mousePos.x * 0.4) * 0.05;

    ring3.rotation.x = ring3.rotation.x * 0.95 + (mousePos.y * 0.275) * 0.05;
    ring3.rotation.y = ring3.rotation.y * 0.95 + (mousePos.x * 0.275) * 0.05;


    //движение стрелок
    let date = new Date();

    const hourAngle = date.getHours() / 12 * Math.PI * 2;
    /*hourLine.rotation.z = -hourAngle;
    hourLine.position.set(Math.sin(hourAngle), Math.cos(hourAngle), 0);*/
    rotateLine(hourLine, hourAngle, ring1.rotation, 1.0, 0);

    const minuteAngle = date.getMinutes() / 60 * Math.PI * 2;
    rotateLine(minuteLine, minuteAngle, ring1.rotation, 0.8, 0.1);

    const secondAngle = (date.getSeconds() + date.getMilliseconds() / 1000) / 60 * Math.PI * 2;
    rotateLine(secondLine, secondAngle, ring1.rotation, 0.75, -0.1);

    cLines.children.forEach((c, i) => {
      rotateLine(c, i / 12 * Math.PI * 2, ring1.rotation, 1.72, 0.2)
    });


    controls.update();
    render.render(scene, camera);
  })
}

function rotateLine(line, angle, ringRotation, topTranslation, depthTranslation) {
  let tmatrix  = new Matrix4().makeTranslation(0, topTranslation, depthTranslation);
  let rmatrix  = new Matrix4().makeRotationAxis(new Vector3(0, 0, 1), -angle);
  let r1matrix = new Matrix4().makeRotationFromEuler(new Euler().copy(ringRotation));

  line.matrix.copy(new Matrix4().multiply(r1matrix).multiply(rmatrix).multiply(tmatrix));
  line.matrixAutoUpdate = false;
  line.matrixWorldNeedsUpdate = false;
}

function CustomRing(envRT, thickness, color) {
  const ring = new Mesh(
    new RingGeometry(
      2,
      2 + thickness,
      70),
    new MeshStandardMaterial({
      envMap: envRT.texture,
      roughness: 0,
      metalness: 1,
      side: DoubleSide,
      color,
      envMapIntensity: 1
    })
  );
  ring.position.set(0, 0, 0.25 * 0.5);

  //создаем толщину
  const outerCylinder = new Mesh(
    new CylinderBufferGeometry(
      2 + thickness,
      2 + thickness,
      0.25,
      70,
      1,
      true
    ),
    new MeshStandardMaterial({
      envMap: envRT.texture,
      roughness: 0,
      metalness: 1,
      side: DoubleSide,
      color,
      envMapIntensity: 1
    })
  );
  outerCylinder.rotation.x = Math.PI * 0.5;

  const innerCylinder = new Mesh(
    new CylinderBufferGeometry(
      2,
      2,
      0.25,
      140,
      1,
      true
    ),
    new MeshStandardMaterial({
      envMap: envRT.texture,
      roughness: 0,
      metalness: 1,
      side: DoubleSide,
      color,
      envMapIntensity: 1
    }));
  innerCylinder.rotation.x = Math.PI * 0.5;

  const group = new Group();
  group.add (ring, outerCylinder, innerCylinder);


  return group;
}

function CustomLine(height, width, depth, envRT, color, envMapIntensity) {
  const box = new Mesh(
    new BoxBufferGeometry(width, height, depth),
    new MeshStandardMaterial({
      envMap: envRT.texture,
      roughness: 0,
      metalness: 1,
      side: DoubleSide,
      color,
      envMapIntensity: 1
    }));
  box.position.set (0, 0, 0);

  //верхушка стрелки
  const topCap = new Mesh(
    new CylinderBufferGeometry(
      width * 0.5,
      width * 0.5,
      depth,
      10
    ),
    new MeshStandardMaterial({
      envMap: envRT.texture,
      roughness: 0,
      metalness: 1,
      side: DoubleSide,
      color,
      envMapIntensity: 1
    })
  );
  topCap.rotation.x = Math.PI * 0.5;
  topCap.position.set(0, +height * 0.5, 0);

  //низ стрелки
  const bottomCap = new Mesh(
    new CylinderBufferGeometry(
      width * 0.5,
      width * 0.5,
      depth,
      10
    ),
    new MeshStandardMaterial({
      envMap: envRT.texture,
      roughness: 0,
      metalness: 1,
      side: DoubleSide,
      color,
      envMapIntensity: 1
    })
  );
  bottomCap.rotation.x = Math.PI * 0.5;
  bottomCap.position.set(0, -height * 0.5, 0);

  const group = new Group();
  group.add(box, topCap, bottomCap);

  return group;
}

function clockLines(envRT) {
  const group = new Group();

  for (let i = 0; i < 12; i++) {
    const line = CustomLine(
      0.1,
      0.075,
      0.025,
      envRT,
      new Color(0.65, 0.65, 0.65),
      1
    );
    group.add(line);
  }

  return group;
}

init();