"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tf = require("@tensorflow/tfjs-core");
const box_1 = require("./box");
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
            const scaledBoxes = boxes.map((prediction) => box_1.enlargeBox(box_1.scaleBoxCoordinates(prediction, scaleFactor)));
            boxes.forEach(box_1.disposeBox);
            this.updateRegionsOfInterest(scaledBoxes);
            this.runsWithoutFaceDetector = 0;
        }
        else {
            this.runsWithoutFaceDetector++;
        }
        return tf.tidy(() => {
            return this.regionsOfInterest.map((box, i) => {
                const face = box_1.cutBoxFromImageAndResize(box, input, [
                    this.meshHeight, this.meshWidth
                ]).div(255);
                const [, flag, coords] = this.meshDetector.predict(face);
                const coordsReshaped = tf.reshape(coords, [-1, 3]);
                const normalizedBox = tf.div(box_1.getBoxSize(box), [this.meshWidth, this.meshHeight]);
                const scaledCoords = tf.mul(coordsReshaped, normalizedBox.concat(tf.tensor2d([1], [1, 1]), 1))
                    .add(box.startPoint.concat(tf.tensor2d([0], [1, 1]), 1));
                const landmarksBox = this.calculateLandmarksBoundingBox(scaledCoords);
                const previousBox = this.regionsOfInterest[i];
                box_1.disposeBox(previousBox);
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
                box_1.disposeBox(box);
            }
            else {
                this.regionsOfInterest[i] = box;
                box_1.disposeBox(previousBox);
            }
        }
        for (let i = boxes.length; i < this.regionsOfInterest.length; i++) {
            box_1.disposeBox(this.regionsOfInterest[i]);
        }
        this.regionsOfInterest = this.regionsOfInterest.slice(0, boxes.length);
    }
    clearRegionOfInterest(index) {
        if (this.regionsOfInterest[index] != null) {
            box_1.disposeBox(this.regionsOfInterest[index]);
            this.regionsOfInterest = [
                ...this.regionsOfInterest.slice(0, index),
                ...this.regionsOfInterest.slice(index + 1)
            ];
        }
    }
    clearAllRegionsOfInterest() {
        for (let i = 0; i < this.regionsOfInterest.length; i++) {
            box_1.disposeBox(this.regionsOfInterest[i]);
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
        const box = box_1.createBox(boxMinMax.expandDims(0));
        return box_1.enlargeBox(box);
    }
}
exports.Pipeline = Pipeline;
//# sourceMappingURL=pipeline.js.map