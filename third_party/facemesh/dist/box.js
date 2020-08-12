"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tf = require("@tensorflow/tfjs-core");
function disposeBox(box) {
    if (box != null && box.startPoint != null) {
        box.startEndTensor.dispose();
        box.startPoint.dispose();
        box.endPoint.dispose();
    }
}
exports.disposeBox = disposeBox;
function createBox(startEndTensor, startPoint, endPoint) {
    return {
        startEndTensor,
        startPoint: startPoint != null ? startPoint :
            tf.slice(startEndTensor, [0, 0], [-1, 2]),
        endPoint: endPoint != null ? endPoint :
            tf.slice(startEndTensor, [0, 2], [-1, 2])
    };
}
exports.createBox = createBox;
function scaleBoxCoordinates(box, factor) {
    const newStart = tf.mul(box.startPoint, factor);
    const newEnd = tf.mul(box.endPoint, factor);
    return createBox(tf.concat2d([newStart, newEnd], 1));
}
exports.scaleBoxCoordinates = scaleBoxCoordinates;
function getBoxSize(box) {
    return tf.tidy(() => {
        const diff = tf.sub(box.endPoint, box.startPoint);
        return tf.abs(diff);
    });
}
exports.getBoxSize = getBoxSize;
function getBoxCenter(box) {
    return tf.tidy(() => {
        const halfSize = tf.div(tf.sub(box.endPoint, box.startPoint), 2);
        return tf.add(box.startPoint, halfSize);
    });
}
exports.getBoxCenter = getBoxCenter;
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
exports.cutBoxFromImageAndResize = cutBoxFromImageAndResize;
function enlargeBox(box, factor = 1.5) {
    return tf.tidy(() => {
        const center = getBoxCenter(box);
        const size = getBoxSize(box);
        const newSize = tf.mul(tf.div(size, 2), factor);
        const newStart = tf.sub(center, newSize);
        const newEnd = tf.add(center, newSize);
        return createBox(tf.concat2d([newStart, newEnd], 1), newStart, newEnd);
    });
}
exports.enlargeBox = enlargeBox;
//# sourceMappingURL=box.js.map