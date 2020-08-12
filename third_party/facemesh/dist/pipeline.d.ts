import * as blazeface from '@tensorflow-models/blazeface';
import * as tfconv from '@tensorflow/tfjs-converter';
import * as tf from '@tensorflow/tfjs-core';
import { Box } from './box';
export declare type Prediction = {
    coords: tf.Tensor2D;
    scaledCoords: tf.Tensor2D;
    box: Box;
    flag: tf.Scalar;
};
export declare class Pipeline {
    private boundingBoxDetector;
    private meshDetector;
    private meshWidth;
    private meshHeight;
    private maxContinuousChecks;
    private maxFaces;
    private regionsOfInterest;
    private runsWithoutFaceDetector;
    constructor(boundingBoxDetector: blazeface.BlazeFaceModel, meshDetector: tfconv.GraphModel, meshWidth: number, meshHeight: number, maxContinuousChecks: number, maxFaces: number);
    predict(input: tf.Tensor4D): Promise<Prediction[]>;
    updateRegionsOfInterest(boxes: Box[]): void;
    clearRegionOfInterest(index: number): void;
    clearAllRegionsOfInterest(): void;
    shouldUpdateRegionsOfInterest(): boolean;
    calculateLandmarksBoundingBox(landmarks: tf.Tensor): Box;
}
