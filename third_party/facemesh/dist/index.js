"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const blazeface = require("@tensorflow-models/blazeface");
const tfconv = require("@tensorflow/tfjs-converter");
const tf = require("@tensorflow/tfjs-core");
const keypoints_1 = require("./keypoints");
const pipeline_1 = require("./pipeline");
const FACEMESH_GRAPHMODEL_PATH = 'https://lk-newvane.learnking.net/facedemo/facemesh';
const MESH_MODEL_INPUT_WIDTH = 192;
const MESH_MODEL_INPUT_HEIGHT = 192;
async function load({ maxContinuousChecks = 5, detectionConfidence = 0.9, maxFaces = 10, iouThreshold = 0.3, scoreThreshold = 0.75 } = {}) {
    const [blazeFace, blazeMeshModel] = await Promise.all([
        loadDetectorModel(maxFaces, iouThreshold, scoreThreshold), loadMeshModel()
    ]);
    const faceMesh = new FaceMesh(blazeFace, blazeMeshModel, maxContinuousChecks, detectionConfidence, maxFaces);
    return faceMesh;
}
exports.load = load;
async function loadDetectorModel(maxFaces, iouThreshold, scoreThreshold) {
    return blazeface.load({ maxFaces, iouThreshold, scoreThreshold });
}
async function loadMeshModel() {
    return tfconv.loadGraphModel(FACEMESH_GRAPHMODEL_PATH, { fromTFHub: true });
}
function getInputTensorDimensions(input) {
    return input instanceof tf.Tensor ? [input.shape[0], input.shape[1]] :
        [input.height, input.width];
}
function flipFaceHorizontal(face, imageWidth) {
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
        this.pipeline = new pipeline_1.Pipeline(blazeFace, blazeMeshModel, MESH_MODEL_INPUT_WIDTH, MESH_MODEL_INPUT_HEIGHT, maxContinuousChecks, maxFaces);
        this.detectionConfidence = detectionConfidence;
    }
    static getAnnotations() {
        return keypoints_1.MESH_ANNOTATIONS;
    }
    async estimateFaces(input, returnTensors = false, flipHorizontal = false) {
        const [, width] = getInputTensorDimensions(input);
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
                        return flipFaceHorizontal(annotatedPrediction, width);
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
                        flipFaceHorizontal(annotatedPrediction, width);
                }
                const annotations = {};
                for (const key in keypoints_1.MESH_ANNOTATIONS) {
                    annotations[key] = keypoints_1.MESH_ANNOTATIONS[key].map(index => annotatedPrediction.scaledMesh[index]);
                }
                annotatedPrediction['annotations'] = annotations;
                return annotatedPrediction;
            }));
        }
        return [];
    }
}
exports.FaceMesh = FaceMesh;
//# sourceMappingURL=index.js.map