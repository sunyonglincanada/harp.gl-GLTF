/*
 * Copyright (C) 2017-2020 HERE Europe B.V.
 * Licensed under Apache 2.0, see full license in LICENSE
 * SPDX-License-Identifier: Apache-2.0
 */

import { GeoCoordinates } from "@here/harp-geoutils";
import { MapAnchor, MapViewEventNames, RenderEvent } from "@here/harp-mapview";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { MapControls, MapControlsUI } from "@here/harp-map-controls";
import {
  VectorTileDataSource,
  GeoJsonDataProvider,
  APIFormat,
  AuthenticationMethod,
} from "@here/harp-vectortile-datasource";
import { CopyrightElementHandler, MapView } from "@here/harp-mapview";
import { StyleSet } from "@here/harp-datasource-protocol";
import * as Stats from "stats.js";

import { View } from "../View";
import { apikey, copyrightInfo } from "../config";

var stats = new Stats();
stats.setMode(0); // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.domElement);

const imageString =
  // tslint:disable-next-line:max-line-length
  "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPCEtLSBHZW5lcmF0b3I6IEFkb2JlIElsbHVzdHJhdG9yIDIyLjEuMCwgU1ZHIEV4cG9ydCBQbHVnLUluIC4gU1ZHIFZlcnNpb246IDYuMDAgQnVpbGQgMCkgIC0tPgo8c3ZnIHdpZHRoPSI0OHB4IiBoZWlnaHQ9IjQ4cHgiIHZlcnNpb249IjEuMSIgaWQ9Imx1aS1pY29uLWRlc3RpbmF0aW9ucGluLW9uZGFyay1zb2xpZC1sYXJnZSIKCSB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB4PSIwcHgiIHk9IjBweCIgdmlld0JveD0iMCAwIDQ4IDQ4IgoJIGVuYWJsZS1iYWNrZ3JvdW5kPSJuZXcgMCAwIDQ4IDQ4IiB4bWw6c3BhY2U9InByZXNlcnZlIj4KPGc+Cgk8ZyBpZD0ibHVpLWljb24tZGVzdGluYXRpb25waW4tb25kYXJrLXNvbGlkLWxhcmdlLWJvdW5kaW5nLWJveCIgb3BhY2l0eT0iMCI+CgkJPHBhdGggZmlsbD0iI2ZmZmZmZiIgZD0iTTQ3LDF2NDZIMVYxSDQ3IE00OCwwSDB2NDhoNDhWMEw0OCwweiIvPgoJPC9nPgoJPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGZpbGw9IiNmZmZmZmYiIGQ9Ik0yNCwyQzEzLjg3MDgsMiw1LjY2NjcsMTAuMTU4NCw1LjY2NjcsMjAuMjIzMwoJCWMwLDUuMDMyNSwyLjA1MzMsOS41ODg0LDUuMzcxNywxMi44ODgzTDI0LDQ2bDEyLjk2MTctMTIuODg4M2MzLjMxODMtMy4zLDUuMzcxNy03Ljg1NTgsNS4zNzE3LTEyLjg4ODMKCQlDNDIuMzMzMywxMC4xNTg0LDM0LjEyOTIsMiwyNCwyeiBNMjQsMjVjLTIuNzY1LDAtNS0yLjIzNS01LTVzMi4yMzUtNSw1LTVzNSwyLjIzNSw1LDVTMjYuNzY1LDI1LDI0LDI1eiIvPgo8L2c+Cjwvc3ZnPgo=";

const mapView = initializeMapView("mapCanvas");

const omvDataSource = new VectorTileDataSource({
  baseUrl: "https://vector.hereapi.com/v2/vectortiles/base/mc",
  apiFormat: APIFormat.XYZOMV,
  styleSetName: "tilezen",
  maxDataLevel: 17,
  authenticationCode: apikey,
  authenticationMethod: {
    method: AuthenticationMethod.QueryString,
    name: "apikey",
  },
  copyrightInfo,
});

mapView.addDataSource(omvDataSource);

/**
 * Creates a new MapView for the HTMLCanvasElement of the given id.
 */
// snippet:datasource_geojson_load1.ts
function initializeMapView(id: string): MapView {
  const canvas = document.getElementById(id) as HTMLCanvasElement;
  const app = new View({
    canvas: document.getElementById("map") as HTMLCanvasElement,
    theme: {
      extends: "resources/berlin_tilezen_night_reduced.json",
      styles: {
        geojson: [
          {
            when: ["==", ["geometry-type"], "Point"],
            technique: "labeled-icon",
            text: ["get", "text"],
            priority: 10000, // Displace other labels
            size: 14,
            imageTexture: "custom-icon",
            screenHeight: 32,
            iconScale: 0.5,
            distanceScale: 1,
            iconYOffset: 20,
          },
        ],
      },
      images: {
        "custom-icon": {
          url: imageString,
          preload: true,
        },
      },
      imageTextures: [
        {
          name: "custom-icon",
          image: "custom-icon",
        },
      ],
    },
  });

  const mapView = app.mapView;

  CopyrightElementHandler.install("copyrightNotice").attach(mapView);

  const controls = new MapControls(mapView);

  // Add an UI.
  // const ui = new MapControlsUI(controls, { projectionSwitch: true });
  // canvas.parentElement!.appendChild(ui.domElement);

  window.addEventListener("resize", () => {
    mapView.resize(window.innerWidth, window.innerHeight);
  });

  // Create a [[GeoJsonDataProvider]] from a GeoJson URL and plug it into an OmvDataSource.
  const geoJsonDataProvider = new GeoJsonDataProvider(
    "points",
    new URL("resources/points.json", window.location.href)
  );
  const geoJsonDataSource = new VectorTileDataSource({
    dataProvider: geoJsonDataProvider,
    name: "geojson",
    styleSetName: "geojson",
  });
  mapView.addDataSource(geoJsonDataSource);

  // GLTF
  const figureGeoPosition = new GeoCoordinates(36.1295042, -5.3883195);
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

  mapView.update();

  return mapView;
}
