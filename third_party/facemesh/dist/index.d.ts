import * as blazeface from '@tensorflow-models/blazeface';
import * as tfconv from '@tensorflow/tfjs-converter';
import * as tf from '@tensorflow/tfjs-core';
interface AnnotatedPredictionValues {
    faceInViewConfidence: number;
    boundingBox: {
        topLeft: [number, number];
        bottomRight: [number, number];
    };
    mesh: Array<[number, number, number]>;
    scaledMesh: Array<[number, number, number]>;
    annotations?: {
        [key: string]: Array<[number, number, number]>;
    };
}
interface AnnotatedPredictionTensors {
    faceInViewConfidence: number;
    boundingBox: {
        topLeft: tf.Tensor1D;
        bottomRight: tf.Tensor1D;
    };
    mesh: tf.Tensor2D;
    scaledMesh: tf.Tensor2D;
}
export declare type AnnotatedPrediction = AnnotatedPredictionValues | AnnotatedPredictionTensors;
export declare function load({ maxContinuousChecks, detectionConfidence, maxFaces, iouThreshold, scoreThreshold }?: {
    maxContinuousChecks?: number;
    detectionConfidence?: number;
    maxFaces?: number;
    iouThreshold?: number;
    scoreThreshold?: number;
}): Promise<FaceMesh>;
export declare class FaceMesh {
    private pipeline;
    private detectionConfidence;
    constructor(blazeFace: blazeface.BlazeFaceModel, blazeMeshModel: tfconv.GraphModel, maxContinuousChecks: number, detectionConfidence: number, maxFaces: number);
    static getAnnotations(): {
        [key: string]: number[];
    };
    estimateFaces(input: tf.Tensor3D | ImageData | HTMLVideoElement | HTMLImageElement | HTMLCanvasElement, returnTensors?: boolean, flipHorizontal?: boolean): Promise<AnnotatedPrediction[]>;
}
export {};
