import * as tf from '@tensorflow/tfjs-core';
export declare type Box = {
    startPoint: tf.Tensor2D;
    endPoint: tf.Tensor2D;
    startEndTensor: tf.Tensor2D;
};
export declare function disposeBox(box: Box): void;
export declare function createBox(startEndTensor: tf.Tensor2D, startPoint?: tf.Tensor2D, endPoint?: tf.Tensor2D): Box;
export declare function scaleBoxCoordinates(box: Box, factor: tf.Tensor1D | [number, number]): Box;
export declare function getBoxSize(box: Box): tf.Tensor2D;
export declare function getBoxCenter(box: Box): tf.Tensor2D;
export declare function cutBoxFromImageAndResize(box: Box, image: tf.Tensor4D, cropSize: [number, number]): tf.Tensor4D;
export declare function enlargeBox(box: Box, factor?: number): Box;
