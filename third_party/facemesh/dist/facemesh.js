/**
    * @license
    * Copyright 2020 Google LLC. All Rights Reserved.
    * Licensed under the Apache License, Version 2.0 (the "License");
    * you may not use this file except in compliance with the License.
    * You may obtain a copy of the License at
    *
    * http://www.apache.org/licenses/LICENSE-2.0
    *
    * Unless required by applicable law or agreed to in writing, software
    * distributed under the License is distributed on an "AS IS" BASIS,
    * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    * See the License for the specific language governing permissions and
    * limitations under the License.
    * =============================================================================
    */
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@tensorflow/tfjs-core'), require('@tensorflow/tfjs-converter')) :
    typeof define === 'function' && define.amd ? define(['exports', '@tensorflow/tfjs-core', '@tensorflow/tfjs-converter'], factory) :
    (factory((global.facemesh = {}),global.tf,global.tf));
}(this, (function (exports,tf,tfconv) { 'use strict';

    /**
        * @license
        * Copyright 2020 Google LLC. All Rights Reserved.
        * Licensed under the Apache License, Version 2.0 (the "License");
        * you may not use this file except in compliance with the License.
        * You may obtain a copy of the License at
        *
        * http://www.apache.org/licenses/LICENSE-2.0
        *
        * Unless required by applicable law or agreed to in writing, software
        * distributed under the License is distributed on an "AS IS" BASIS,
        * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
        * See the License for the specific language governing permissions and
        * limitations under the License.
        * =============================================================================
        */
    const disposeBox=t=>{t.startEndTensor.dispose(),t.startPoint.dispose(),t.endPoint.dispose();},createBox=t=>({startEndTensor:t,startPoint:tf.slice(t,[0,0],[-1,2]),endPoint:tf.slice(t,[0,2],[-1,2])}),scaleBox=(t,o)=>{const s=tf.mul(t.startPoint,o),e=tf.mul(t.endPoint,o),i=tf.concat2d([s,e],1);return createBox(i)},ANCHORS_CONFIG={strides:[8,16],anchors:[2,6]},NUM_LANDMARKS=6;function generateAnchors(t,o,s){const e=[];for(let i=0;i<s.strides.length;i++){const n=s.strides[i],a=Math.floor((o+n-1)/n),r=Math.floor((t+n-1)/n),c=s.anchors[i];for(let t=0;t<a;t++){const o=n*(t+.5);for(let t=0;t<r;t++){const s=n*(t+.5);for(let t=0;t<c;t++)e.push([s,o]);}}}return e}function decodeBounds(t,o,s){const e=tf.slice(t,[0,1],[-1,2]),i=tf.add(e,o),n=tf.slice(t,[0,3],[-1,2]),a=tf.div(n,s),r=tf.div(i,s),c=tf.div(a,2),l=tf.sub(r,c),d=tf.add(r,c),h=tf.mul(l,s),p=tf.mul(d,s);return tf.concat2d([h,p],1)}function getInputTensorDimensions(t){return t instanceof tf.Tensor?[t.shape[0],t.shape[1]]:[t.height,t.width]}function flipFaceHorizontal(t,o){let s,e,i;if(t.topLeft instanceof tf.Tensor&&t.bottomRight instanceof tf.Tensor){const[n,a]=tf.tidy(()=>[tf.concat([tf.sub(o-1,t.topLeft.slice(0,1)),t.topLeft.slice(1,1)]),tf.concat([tf.sub(o-1,t.bottomRight.slice(0,1)),t.bottomRight.slice(1,1)])]);s=n,e=a,null!=t.landmarks&&(i=tf.tidy(()=>{const s=tf.sub(tf.tensor1d([o-1,0]),t.landmarks),e=tf.tensor1d([1,-1]);return tf.mul(s,e)}));}else{const[n,a]=t.topLeft,[r,c]=t.bottomRight;s=[o-1-n,a],e=[o-1-r,c],null!=t.landmarks&&(i=t.landmarks.map(t=>[o-1-t[0],t[1]]));}const n={topLeft:s,bottomRight:e};return null!=i&&(n.landmarks=i),null!=t.probability&&(n.probability=t.probability instanceof tf.Tensor?t.probability.clone():t.probability),n}function scaleBoxFromPrediction(t,o){return tf.tidy(()=>{let s;return s=t.hasOwnProperty("box")?t.box:t,scaleBox(s,o).startEndTensor.squeeze()})}class BlazeFaceModel{constructor(t,o,s,e,i,n){this.blazeFaceModel=t,this.width=o,this.height=s,this.maxFaces=e,this.anchorsData=generateAnchors(o,s,ANCHORS_CONFIG),this.anchors=tf.tensor2d(this.anchorsData),this.inputSizeData=[o,s],this.inputSize=tf.tensor1d([o,s]),this.iouThreshold=i,this.scoreThreshold=n;}async getBoundingBoxes(t,o,s=!0){const[e,i,n]=tf.tidy(()=>{const o=t.resizeBilinear([this.width,this.height]),s=tf.mul(tf.sub(o.div(255),.5),2),e=this.blazeFaceModel.predict(s).squeeze(),i=decodeBounds(e,this.anchors,this.inputSize),n=tf.slice(e,[0,0],[-1,1]);return[e,i,tf.sigmoid(n).squeeze()]}),a=console.warn;console.warn=(()=>{});const r=tf.image.nonMaxSuppression(i,n,this.maxFaces,this.iouThreshold,this.scoreThreshold);console.warn=a;const c=await r.array();r.dispose();let l=c.map(t=>tf.slice(i,[t,0],[1,-1]));o||(l=await Promise.all(l.map(async t=>{const o=await t.array();return t.dispose(),o})));const d=t.shape[1],h=t.shape[2];let p;p=o?tf.div([h,d],this.inputSize):[h/this.inputSizeData[0],d/this.inputSizeData[1]];const u=[];for(let t=0;t<l.length;t++){const i=l[t],a=tf.tidy(()=>{const a=createBox(i instanceof tf.Tensor?i:tf.tensor2d(i));if(!s)return a;const r=c[t];let l;return l=o?this.anchors.slice([r,0],[1,2]):this.anchorsData[r],{box:a,landmarks:tf.slice(e,[r,NUM_LANDMARKS-1],[1,-1]).squeeze().reshape([NUM_LANDMARKS,-1]),probability:tf.slice(n,[r],[1]),anchor:l}});u.push(a);}return i.dispose(),n.dispose(),e.dispose(),{boxes:u,scaleFactor:p}}async estimateFaces(t,o=!1,s=!1,e=!0){const[,i]=getInputTensorDimensions(t),n=tf.tidy(()=>(t instanceof tf.Tensor||(t=tf.browser.fromPixels(t)),t.toFloat().expandDims(0))),{boxes:a,scaleFactor:r}=await this.getBoundingBoxes(n,o,e);return n.dispose(),o?a.map(t=>{const o=scaleBoxFromPrediction(t,r);let n={topLeft:o.slice([0],[2]),bottomRight:o.slice([2],[2])};if(e){const{landmarks:o,probability:s,anchor:e}=t,i=o.add(e).mul(r);n.landmarks=i,n.probability=s;}return s&&(n=flipFaceHorizontal(n,i)),n}):Promise.all(a.map(async t=>{const o=scaleBoxFromPrediction(t,r);let n;if(e){const[s,e,i]=await Promise.all([t.landmarks,o,t.probability].map(async t=>t.array())),a=t.anchor,[c,l]=r,d=s.map(t=>[(t[0]+a[0])*c,(t[1]+a[1])*l]);n={topLeft:e.slice(0,2),bottomRight:e.slice(2),landmarks:d,probability:i},disposeBox(t.box),t.landmarks.dispose(),t.probability.dispose();}else{const t=await o.array();n={topLeft:t.slice(0,2),bottomRight:t.slice(2)};}return o.dispose(),s&&(n=flipFaceHorizontal(n,i)),n}))}}const BLAZEFACE_MODEL_URL="https://lk-newvane.learnking.net/facedemo/blazeface";async function load({maxFaces:t=10,inputWidth:o=128,inputHeight:s=128,iouThreshold:e=.3,scoreThreshold:i=.75}={}){const n=await tfconv.loadGraphModel(BLAZEFACE_MODEL_URL,{fromTFHub:!0});return new BlazeFaceModel(n,o,s,t,e,i)}

    const MESH_ANNOTATIONS = {
        silhouette: [
            10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
            397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
            172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109
        ],
        lipsUpperOuter: [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291],
        lipsLowerOuter: [146, 91, 181, 84, 17, 314, 405, 321, 375, 291],
        lipsUpperInner: [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308],
        lipsLowerInner: [78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308],
        rightEyeUpper0: [246, 161, 160, 159, 158, 157, 173],
        rightEyeLower0: [33, 7, 163, 144, 145, 153, 154, 155, 133],
        rightEyeUpper1: [247, 30, 29, 27, 28, 56, 190],
        rightEyeLower1: [130, 25, 110, 24, 23, 22, 26, 112, 243],
        rightEyeUpper2: [113, 225, 224, 223, 222, 221, 189],
        rightEyeLower2: [226, 31, 228, 229, 230, 231, 232, 233, 244],
        rightEyeLower3: [143, 111, 117, 118, 119, 120, 121, 128, 245],
        rightEyebrowUpper: [156, 70, 63, 105, 66, 107, 55, 193],
        rightEyebrowLower: [35, 124, 46, 53, 52, 65],
        leftEyeUpper0: [466, 388, 387, 386, 385, 384, 398],
        leftEyeLower0: [263, 249, 390, 373, 374, 380, 381, 382, 362],
        leftEyeUpper1: [467, 260, 259, 257, 258, 286, 414],
        leftEyeLower1: [359, 255, 339, 254, 253, 252, 256, 341, 463],
        leftEyeUpper2: [342, 445, 444, 443, 442, 441, 413],
        leftEyeLower2: [446, 261, 448, 449, 450, 451, 452, 453, 464],
        leftEyeLower3: [372, 340, 346, 347, 348, 349, 350, 357, 465],
        leftEyebrowUpper: [383, 300, 293, 334, 296, 336, 285, 417],
        leftEyebrowLower: [265, 353, 276, 283, 282, 295],
        midwayBetweenEyes: [168],
        noseTip: [1],
        noseBottom: [2],
        noseRightCorner: [98],
        noseLeftCorner: [327],
        rightCheek: [205],
        leftCheek: [425]
    };

    function disposeBox$1(box) {
        if (box != null && box.startPoint != null) {
            box.startEndTensor.dispose();
            box.startPoint.dispose();
            box.endPoint.dispose();
        }
    }
    function createBox$1(startEndTensor, startPoint, endPoint) {
        return {
            startEndTensor,
            startPoint: startPoint != null ? startPoint :
                tf.slice(startEndTensor, [0, 0], [-1, 2]),
            endPoint: endPoint != null ? endPoint :
                tf.slice(startEndTensor, [0, 2], [-1, 2])
        };
    }
    function scaleBoxCoordinates(box, factor) {
        const newStart = tf.mul(box.startPoint, factor);
        const newEnd = tf.mul(box.endPoint, factor);
        return createBox$1(tf.concat2d([newStart, newEnd], 1));
    }
    function getBoxSize(box) {
        return tf.tidy(() => {
            const diff = tf.sub(box.endPoint, box.startPoint);
            return tf.abs(diff);
        });
    }
    function getBoxCenter(box) {
        return tf.tidy(() => {
            const halfSize = tf.div(tf.sub(box.endPoint, box.startPoint), 2);
            return tf.add(box.startPoint, halfSize);
        });
    }
    function cutBoxFromImageAndResize(box, image, cropSize) {
        const height = image.shape[1];
        const width = image.shape[2];
        const xyxy = box.startEndTensor;
        return tf.tidy(() => {
            const yxyx = tf.concat2d([
                xyxy.slice([0, 1], [-1, 1]), xyxy.slice([0, 0], [-1, 1]),
                xyxy.slice([0, 3], [-1, 1]), xyxy.slice([0, 2], [-1, 1])
            ], 0);
            const roundedCoords = tf.div(yxyx.transpose(), [height, width, height, width]);
            return tf.image.cropAndResize(image, roundedCoords, [0], cropSize);
        });
    }
    function enlargeBox(box, factor = 1.5) {
        return tf.tidy(() => {
            const center = getBoxCenter(box);
            const size = getBoxSize(box);
            const newSize = tf.mul(tf.div(size, 2), factor);
            const newStart = tf.sub(center, newSize);
            const newEnd = tf.add(center, newSize);
            return createBox$1(tf.concat2d([newStart, newEnd], 1), newStart, newEnd);
        });
    }

    const LANDMARKS_COUNT = 468;
    const UPDATE_REGION_OF_INTEREST_IOU_THRESHOLD = 0.25;
    class Pipeline {
        constructor(boundingBoxDetector, meshDetector, meshWidth, meshHeight, maxContinuousChecks, maxFaces) {
            this.regionsOfInterest = [];
            this.runsWithoutFaceDetector = 0;
            this.boundingBoxDetector = boundingBoxDetector;
            this.meshDetector = meshDetector;
            this.meshWidth = meshWidth;
            this.meshHeight = meshHeight;
            this.maxContinuousChecks = maxContinuousChecks;
            this.maxFaces = maxFaces;
        }
        async predict(input) {
            if (this.shouldUpdateRegionsOfInterest()) {
                const returnTensors = true;
                const annotateFace = false;
                const { boxes, scaleFactor } = await this.boundingBoxDetector.getBoundingBoxes(input, returnTensors, annotateFace);
                if (boxes.length === 0) {
                    scaleFactor.dispose();
                    this.clearAllRegionsOfInterest();
                    return null;
                }
                const scaledBoxes = boxes.map((prediction) => enlargeBox(scaleBoxCoordinates(prediction, scaleFactor)));
                boxes.forEach(disposeBox$1);
                this.updateRegionsOfInterest(scaledBoxes);
                this.runsWithoutFaceDetector = 0;
            }
            else {
                this.runsWithoutFaceDetector++;
            }
            return tf.tidy(() => {
                return this.regionsOfInterest.map((box, i) => {
                    const face = cutBoxFromImageAndResize(box, input, [
                        this.meshHeight, this.meshWidth
                    ]).div(255);
                    const [, flag, coords] = this.meshDetector.predict(face);
                    const coordsReshaped = tf.reshape(coords, [-1, 3]);
                    const normalizedBox = tf.div(getBoxSize(box), [this.meshWidth, this.meshHeight]);
                    const scaledCoords = tf.mul(coordsReshaped, normalizedBox.concat(tf.tensor2d([1], [1, 1]), 1))
                        .add(box.startPoint.concat(tf.tensor2d([0], [1, 1]), 1));
                    const landmarksBox = this.calculateLandmarksBoundingBox(scaledCoords);
                    const previousBox = this.regionsOfInterest[i];
                    disposeBox$1(previousBox);
                    this.regionsOfInterest[i] = landmarksBox;
                    const prediction = {
                        coords: coordsReshaped,
                        scaledCoords,
                        box: landmarksBox,
                        flag: flag.squeeze()
                    };
                    return prediction;
                });
            });
        }
        updateRegionsOfInterest(boxes) {
            for (let i = 0; i < boxes.length; i++) {
                const box = boxes[i];
                const previousBox = this.regionsOfInterest[i];
                let iou = 0;
                if (previousBox && previousBox.startPoint) {
                    const [boxStartX, boxStartY, boxEndX, boxEndY] = box.startEndTensor.arraySync()[0];
                    const [previousBoxStartX, previousBoxStartY, previousBoxEndX, previousBoxEndY] = previousBox.startEndTensor.arraySync()[0];
                    const xStartMax = Math.max(boxStartX, previousBoxStartX);
                    const yStartMax = Math.max(boxStartY, previousBoxStartY);
                    const xEndMin = Math.min(boxEndX, previousBoxEndX);
                    const yEndMin = Math.min(boxEndY, previousBoxEndY);
                    const intersection = (xEndMin - xStartMax) * (yEndMin - yStartMax);
                    const boxArea = (boxEndX - boxStartX) * (boxEndY - boxStartY);
                    const previousBoxArea = (previousBoxEndX - previousBoxStartX) *
                        (previousBoxEndY - boxStartY);
                    iou = intersection / (boxArea + previousBoxArea - intersection);
                }
                if (iou > UPDATE_REGION_OF_INTEREST_IOU_THRESHOLD) {
                    disposeBox$1(box);
                }
                else {
                    this.regionsOfInterest[i] = box;
                    disposeBox$1(previousBox);
                }
            }
            for (let i = boxes.length; i < this.regionsOfInterest.length; i++) {
                disposeBox$1(this.regionsOfInterest[i]);
            }
            this.regionsOfInterest = this.regionsOfInterest.slice(0, boxes.length);
        }
        clearRegionOfInterest(index) {
            if (this.regionsOfInterest[index] != null) {
                disposeBox$1(this.regionsOfInterest[index]);
                this.regionsOfInterest = [
                    ...this.regionsOfInterest.slice(0, index),
                    ...this.regionsOfInterest.slice(index + 1)
                ];
            }
        }
        clearAllRegionsOfInterest() {
            for (let i = 0; i < this.regionsOfInterest.length; i++) {
                disposeBox$1(this.regionsOfInterest[i]);
            }
            this.regionsOfInterest = [];
        }
        shouldUpdateRegionsOfInterest() {
            const roisCount = this.regionsOfInterest.length;
            const noROIs = roisCount === 0;
            if (this.maxFaces === 1 || noROIs) {
                return noROIs;
            }
            return roisCount !== this.maxFaces &&
                this.runsWithoutFaceDetector >= this.maxContinuousChecks;
        }
        calculateLandmarksBoundingBox(landmarks) {
            const xs = landmarks.slice([0, 0], [LANDMARKS_COUNT, 1]);
            const ys = landmarks.slice([0, 1], [LANDMARKS_COUNT, 1]);
            const boxMinMax = tf.stack([xs.min(), ys.min(), xs.max(), ys.max()]);
            const box = createBox$1(boxMinMax.expandDims(0));
            return enlargeBox(box);
        }
    }

    const FACEMESH_GRAPHMODEL_PATH = 'https://lk-newvane.learnking.net/facedemo/facemesh';
    const MESH_MODEL_INPUT_WIDTH = 192;
    const MESH_MODEL_INPUT_HEIGHT = 192;
    async function load$1({ maxContinuousChecks = 5, detectionConfidence = 0.9, maxFaces = 10, iouThreshold = 0.3, scoreThreshold = 0.75 } = {}) {
        const [blazeFace, blazeMeshModel] = await Promise.all([
            loadDetectorModel(maxFaces, iouThreshold, scoreThreshold), loadMeshModel()
        ]);
        const faceMesh = new FaceMesh(blazeFace, blazeMeshModel, maxContinuousChecks, detectionConfidence, maxFaces);
        return faceMesh;
    }
    async function loadDetectorModel(maxFaces, iouThreshold, scoreThreshold) {
        return load({ maxFaces, iouThreshold, scoreThreshold });
    }
    async function loadMeshModel() {
        return tfconv.loadGraphModel(FACEMESH_GRAPHMODEL_PATH, { fromTFHub: true });
    }
    function getInputTensorDimensions$1(input) {
        return input instanceof tf.Tensor ? [input.shape[0], input.shape[1]] :
            [input.height, input.width];
    }
    function flipFaceHorizontal$1(face, imageWidth) {
        if (face.mesh instanceof tf.Tensor) {
            const [topLeft, bottomRight, mesh, scaledMesh] = tf.tidy(() => {
                const subtractBasis = tf.tensor1d([imageWidth - 1, 0, 0]);
                const multiplyBasis = tf.tensor1d([1, -1, 1]);
                return tf.tidy(() => {
                    return [
                        tf.concat([
                            tf.sub(imageWidth - 1, face.boundingBox.topLeft.slice(0, 1)),
                            face.boundingBox.topLeft.slice(1, 1)
                        ]),
                        tf.concat([
                            tf.sub(imageWidth - 1, face.boundingBox.bottomRight.slice(0, 1)),
                            face.boundingBox.bottomRight.slice(1, 1)
                        ]),
                        tf.sub(subtractBasis, face.mesh).mul(multiplyBasis),
                        tf.sub(subtractBasis, face.scaledMesh).mul(multiplyBasis)
                    ];
                });
            });
            return Object.assign({}, face, { boundingBox: { topLeft, bottomRight }, mesh, scaledMesh });
        }
        return Object.assign({}, face, {
            boundingBox: {
                topLeft: [
                    imageWidth - 1 - face.boundingBox.topLeft[0],
                    face.boundingBox.topLeft[1]
                ],
                bottomRight: [
                    imageWidth - 1 - face.boundingBox.bottomRight[0],
                    face.boundingBox.bottomRight[1]
                ]
            },
            mesh: face.mesh.map(coord => {
                const flippedCoord = coord.slice(0);
                flippedCoord[0] = imageWidth - 1 - coord[0];
                return flippedCoord;
            }),
            scaledMesh: face.scaledMesh.map(coord => {
                const flippedCoord = coord.slice(0);
                flippedCoord[0] = imageWidth - 1 - coord[0];
                return flippedCoord;
            })
        });
    }
    class FaceMesh {
        constructor(blazeFace, blazeMeshModel, maxContinuousChecks, detectionConfidence, maxFaces) {
            this.pipeline = new Pipeline(blazeFace, blazeMeshModel, MESH_MODEL_INPUT_WIDTH, MESH_MODEL_INPUT_HEIGHT, maxContinuousChecks, maxFaces);
            this.detectionConfidence = detectionConfidence;
        }
        static getAnnotations() {
            return MESH_ANNOTATIONS;
        }
        async estimateFaces(input, returnTensors = false, flipHorizontal = false) {
            const [, width] = getInputTensorDimensions$1(input);
            const image = tf.tidy(() => {
                if (!(input instanceof tf.Tensor)) {
                    input = tf.browser.fromPixels(input);
                }
                return input.toFloat().expandDims(0);
            });
            const savedWebglPackDepthwiseConvFlag = tf.env().get('WEBGL_PACK_DEPTHWISECONV');
            tf.env().set('WEBGL_PACK_DEPTHWISECONV', true);
            const predictions = await this.pipeline.predict(image);
            tf.env().set('WEBGL_PACK_DEPTHWISECONV', savedWebglPackDepthwiseConvFlag);
            image.dispose();
            if (predictions != null && predictions.length > 0) {
                return Promise.all(predictions.map(async (prediction, i) => {
                    const { coords, scaledCoords, box, flag } = prediction;
                    let tensorsToRead = [flag];
                    if (!returnTensors) {
                        tensorsToRead = tensorsToRead.concat([coords, scaledCoords, box.startPoint, box.endPoint]);
                    }
                    const tensorValues = await Promise.all(tensorsToRead.map(async (d) => d.array()));
                    const flagValue = tensorValues[0];
                    flag.dispose();
                    if (flagValue < this.detectionConfidence) {
                        this.pipeline.clearRegionOfInterest(i);
                    }
                    if (returnTensors) {
                        const annotatedPrediction = {
                            faceInViewConfidence: flagValue,
                            mesh: coords,
                            scaledMesh: scaledCoords,
                            boundingBox: {
                                topLeft: box.startPoint.squeeze(),
                                bottomRight: box.endPoint.squeeze()
                            }
                        };
                        if (flipHorizontal) {
                            return flipFaceHorizontal$1(annotatedPrediction, width);
                        }
                        return annotatedPrediction;
                    }
                    const [coordsArr, coordsArrScaled, topLeft, bottomRight] = tensorValues.slice(1);
                    scaledCoords.dispose();
                    coords.dispose();
                    let annotatedPrediction = {
                        faceInViewConfidence: flagValue,
                        boundingBox: { topLeft, bottomRight },
                        mesh: coordsArr,
                        scaledMesh: coordsArrScaled
                    };
                    if (flipHorizontal) {
                        annotatedPrediction =
                            flipFaceHorizontal$1(annotatedPrediction, width);
                    }
                    const annotations = {};
                    for (const key in MESH_ANNOTATIONS) {
                        annotations[key] = MESH_ANNOTATIONS[key].map(index => annotatedPrediction.scaledMesh[index]);
                    }
                    annotatedPrediction['annotations'] = annotations;
                    return annotatedPrediction;
                }));
            }
            return [];
        }
    }

    exports.load = load$1;
    exports.FaceMesh = FaceMesh;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
