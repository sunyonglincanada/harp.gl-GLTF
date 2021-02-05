/*
 * Copyright (C) 2017-2020 HERE Europe B.V.
 * Licensed under Apache 2.0, see full license in LICENSE
 * SPDX-License-Identifier: Apache-2.0
 */

import { GeoCoordinates } from "@here/harp-geoutils";
import { MapAnchor, MapViewEventNames, RenderEvent } from "@here/harp-mapview";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import {
  VectorTileDataSource,
  GeoJsonDataProvider,
} from "@here/harp-vectortile-datasource";
import { StyleSet } from "@here/harp-datasource-protocol";
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

const figureGeoPosition = new GeoCoordinates(1.278676, 103.850216);
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

  // snippet:harp_gl_threejs_add_animated-object_add_to_scene.ts
  figure.anchor = figureGeoPosition;
  // Make sure the object is rendered on top of labels
  figure.overlay = true;
  // stats.begin();
  mapView.mapAnchors.add(figure);
  // stats.end();
  // end:harp_gl_threejs_add_animated-object_add_to_scene.ts
};

// snippet:harp_gl_threejs_add_animated-object_load.ts
const loader = new GLTFLoader();
loader.load("resources/H22.glb", onLoad);
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

// center the camera to New York
mapView.lookAt({
  target: new GeoCoordinates(1.278676, 103.850216),
  zoomLevel: 17,
  tilt: 40,
});

// make sure the map is rendered
mapView.update();

async function getWirelessHotspots() {
  const res = await fetch("resources/wireless-hotspots.geojson");
  const data = await res.json();
  const dataProvider = new GeoJsonDataProvider("wireless-hotspots", data);
  const geoJsonDataSource = new VectorTileDataSource({
    dataProvider,
    name: "wireless-hotspots",
  });
  await mapView.addDataSource(geoJsonDataSource);
  const styles: StyleSet = [
    {
      when: ["==", ["geometry-type"], "Point"],
      technique: "circles",
      renderOrder: 10000,
      color: "#FF0000",
      size: 15,
    },
  ];
  geoJsonDataSource.setStyleSet(styles);
  mapView.lookAt({
    target: new GeoCoordinates(1.278676, 103.850216),
    tilt: 45,
    zoomLevel: 16,
  });
  mapView.update();
}

getWirelessHotspots();
