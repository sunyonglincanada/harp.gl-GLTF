/*
 * Copyright (C) 2017-2020 HERE Europe B.V.
 * Licensed under Apache 2.0, see full license in LICENSE
 * SPDX-License-Identifier: Apache-2.0
 */

import { GeoCoordinates } from "@here/harp-geoutils";
import { MapAnchor, MapViewEventNames, RenderEvent } from "@here/harp-mapview";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { LoggerManager } from "@here/harp-utils";
import * as Stats from "stats.js";

import { View } from "./View";

var stats = new Stats();
stats.setMode(0); // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.domElement);

const app = new View({
  canvas: document.getElementById("map") as HTMLCanvasElement,
});

const mapView = app.mapView;

// make map full-screen
mapView.resize(window.innerWidth, window.innerHeight);

// react on resize events from the browser.
window.addEventListener("resize", () => {
  mapView.resize(window.innerWidth, window.innerHeight);
});

const figureGeoPosition = new GeoCoordinates(40.70497091, -74.0135);
mapView.lookAt({
  target: figureGeoPosition,
  zoomLevel: 20,
  tilt: 40,
  heading: 40,
});

const clock = new THREE.Clock();

let figure: MapAnchor<THREE.Group> | undefined;
let mixer: THREE.AnimationMixer | undefined;
const onLoad = (object: any) => {
  figure = object.scene as THREE.Group;
  figure.traverse((child: THREE.Object3D) => {
    child.renderOrder = 10000;
  });
  figure.renderOrder = 10000;
  figure.rotateX(Math.PI / 2);
  figure.scale.set(10, 10, 10);
  figure.name = "guy";

  // // snippet:harp_gl_threejs_add_animated-object_add_to_scene.ts
  figure.anchor = figureGeoPosition;
  // // Make sure the object is rendered on top of labels
  figure.overlay = true;
  // Animation
  console.log(object.animations);
  mixer = new THREE.AnimationMixer(object.scene);
  let action = mixer.clipAction(object.animations[0]);

  // stats.begin();
  mapView.mapAnchors.add(figure);
  action.play();

  // stats.end();
  // end:harp_gl_threejs_add_animated-object_add_to_scene.ts
};

// snippet:harp_gl_threejs_add_animated-object_load.ts
const loader = new GLTFLoader();
// DracoLoader
// const dracoLoader = new DRACOLoader();
// dracoLoader.setDecoderPath(
//   "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/js/libs/draco/"
// ); // use a full url path
// loader.setDRACOLoader(dracoLoader);
loader.load("resources/walking.glb", onLoad);
// end:harp_gl_threejs_add_animated-object_load.ts

const onRender = (event: RenderEvent) => {
  stats.begin();
  if (mixer) {
    // snippet:harp_gl_threejs_add_animated-object_update_animation.ts
    const delta = clock.getDelta();
    mixer.update(delta);
    // end:harp_gl_threejs_add_animated-object_update_animation.ts
  }
  stats.end();
};

// snippet:harp_gl_threejs_add_animated-object_add_listener.ts
mapView.addEventListener(MapViewEventNames.Render, onRender);
// end:harp_gl_threejs_add_animated-object_add_listener.ts

// snippet:harp_gl_threejs_add_animated-object_begin_animation.ts
mapView.beginAnimation();

// GLTF START

// GLTF END

// center the camera to New York
mapView.lookAt({
  target: new GeoCoordinates(40.70398928, -74.01319808),
  zoomLevel: 17,
  tilt: 40,
});

// make sure the map is rendered
mapView.update();
