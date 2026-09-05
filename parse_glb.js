import fs from 'fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
// To run in node, we'd need headless gl, easier to just use standard gltf parsing tools, but three doesn't run in pure node without mocking.
// Instead, let's just write a small react component that logs it to the console in the browser, or we can just use a simple python script? No, we don't have python gltf libs.
