/*
 * Copyright (C) 2017-2020 HERE Europe B.V.
 * Licensed under Apache 2.0, see full license in LICENSE
 * SPDX-License-Identifier: Apache-2.0
 */

import { GeoCoordinates, TileKey } from "@here/harp-geoutils";
import {
  MapAnchor,
  MapViewEventNames,
  RenderEvent,
  Tile,
  TileObject,
  registerTileObject,
  DataSource,
} from "@here/harp-mapview";
import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { GeometryKind } from "@here/harp-datasource-protocol";
import { assert, LoggerManager } from "@here/harp-utils";

import { View } from "./View";

const logger = LoggerManager.instance.create("DataSource");

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
  mixer = new THREE.AnimationMixer(object);

  const action = mixer.clipAction(object.animations[0]);
  action.play();

  figure = object as THREE.Group;
  figure.traverse((child: THREE.Object3D) => {
    child.renderOrder = 10000;
  });
  figure.renderOrder = 10000;
  figure.rotateX(Math.PI / 2);
  figure.scale.set(0.3, 0.3, 0.3);
  figure.name = "guy";

  // snippet:harp_gl_threejs_add_animated-object_add_to_scene.ts
  figure.anchor = figureGeoPosition;
  // Make sure the object is rendered on top of labels
  figure.overlay = true;
  mapView.mapAnchors.add(figure);
  // end:harp_gl_threejs_add_animated-object_add_to_scene.ts
};

// snippet:harp_gl_threejs_add_animated-object_load.ts
const loader = new FBXLoader();
loader.load("resources/dancing.fbx", onLoad);
// end:harp_gl_threejs_add_animated-object_load.ts

const onRender = (event: RenderEvent) => {
  if (mixer) {
    // snippet:harp_gl_threejs_add_animated-object_update_animation.ts
    const delta = clock.getDelta();
    mixer.update(delta);
    // end:harp_gl_threejs_add_animated-object_update_animation.ts
  }
};

// snippet:harp_gl_threejs_add_animated-object_add_listener.ts
mapView.addEventListener(MapViewEventNames.Render, onRender);
// end:harp_gl_threejs_add_animated-object_add_listener.ts

// snippet:harp_gl_threejs_add_animated-object_begin_animation.ts
mapView.beginAnimation();

// GLTF START
const loaderNew = new GLTFLoader();
const tile = new Tile(this, tileKey); //Or whatever Tile implementation you have.

// Assuming you know where to put the model....
const geoPoint = new GeoCoordinates(40.70497091, -74.0135);
const tangentSpace = {
  position: new THREE.Vector3(),
  xAxis: new THREE.Vector3(),
  yAxis: new THREE.Vector3(),
  zAxis: new THREE.Vector3(),
};
this.projection.localTangentSpace(geoPoint, tangentSpace);
const worldPos = tangentSpace.position;
const scaleFactor = this.projection.getScaleFactor(worldPos);
worldPos.sub(tile.center);
let data: ArrayBuffer = "resources/H22.glb";
loaderNew.parse(
  data,
  ".",
  (gltf: GLTF) => {
    for (const child of gltf.scene.children) {
      const obj: TileObject = child;
      obj.displacement = worldPos;
      obj.scale.setScalar(scaleFactor);
      obj.setRotationFromMatrix(
        new THREE.Matrix4().makeBasis(
          tangentSpace.xAxis,
          tangentSpace.yAxis,
          tangentSpace.zAxis
        )
      );
      obj.renderOrder = this.m_renderOrder ?? 1000;
      obj.receiveShadow = tile.mapView.shadowsEnabled;
      obj.castShadow = tile.mapView.shadowsEnabled;
      if ((obj as any).material !== undefined) {
        const alphaTest = 0.66;
        const map = (obj as any).material.map;
        const material = new THREE.MeshPhongMaterial({
          map,
          shininess: 60,
          alphaTest,
          polygonOffset: true, // prevent z-fighting at ground level
          polygonOffsetFactor: -1.0,
          polygonOffsetUnits: -1.0,
        });
        (obj as any).material = material;

        //Needed for shadows... can remove if you don't have shadows
        const customDepthMaterial = new THREE.MeshDepthMaterial({
          depthPacking: THREE.RGBADepthPacking,
          map,
          alphaTest,
        });

        (obj as any).customDepthMaterial = customDepthMaterial;
      }
      registerTileObject(tile, obj, GeometryKind.Building);
      if (obj.type === "Mesh") {
        const mesh = obj as THREE.Mesh;
        mesh.geometry.computeBoundingBox();
        this.maxGeometryHeight = Math.max(
          this.maxGeometryHeight,
          mesh.geometry.boundingBox!.max.z
        );
      }
      tile.objects.push(obj);
    }
    Tile.requestUpdate();
    return await Promise.resolve();
  },
  (error: ErrorEvent) => {
    logger.error(`Error parsing GLTF model`);
    return await Promise.resolve();
  }
);

// GLTF END

// center the camera to New York
mapView.lookAt({
  target: new GeoCoordinates(40.70398928, -74.01319808),
  zoomLevel: 17,
  tilt: 40,
});

// make sure the map is rendered
mapView.update();
