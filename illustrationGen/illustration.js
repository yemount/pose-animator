/**
 * @license
 * Copyright 2020 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

import { Bone, allPartNames, Skeleton } from './skeleton';
import { MathUtils } from '../utils/mathUtils';
import { SVGUtils } from '../utils/svgUtils';
import { ColorUtils } from '../utils/colorUtils';

const allPartNamesMap = {};
allPartNames.forEach(name => allPartNamesMap[name] = 1);

const MIN_CONFIDENCE_PATH_SCORE = 0.3;

// Represents a skinned illustration.
export class PoseIllustration {
    constructor(scope) {
        this.scope = scope;
        this.frames = [];
    }

    updateSkeleton(pose, face) {
        this.pose = pose;
        this.face = face;
        this.skeleton.update(pose, face);
        if (!this.skeleton.isValid) {
            return;
        }

        let getConfidenceScore = (p) => {
            return Object.keys(p.skinning).reduce((totalScore, boneName) => {
                let bt = p.skinning[boneName];
                return totalScore + bt.bone.score * bt.weight;
            }, 0);
        }

        this.skinnedPaths.forEach(skinnedPath => {
            let confidenceScore = 0;
            skinnedPath.segments.forEach(seg => {
                // Compute confidence score.
                confidenceScore += getConfidenceScore(seg.point);
                // Compute new positions for curve point and handles.
                seg.point.currentPosition = Skeleton.getCurrentPosition(seg.point);
                if (seg.handleIn) {
                    seg.handleIn.currentPosition = Skeleton.getCurrentPosition(seg.handleIn);
                }
                if (seg.handleOut) {
                    seg.handleOut.currentPosition = Skeleton.getCurrentPosition(seg.handleOut);
                }
            });
            skinnedPath.confidenceScore = confidenceScore / (skinnedPath.segments.length || 1);
        });
    }

    draw() {
        if (!this.skeleton.isValid) {
            return;
        }
        let scope = this.scope;
        // Add paths
        this.skinnedPaths.forEach(skinnedPath => {
            // Do not render paths with low confidence scores.
            if (!skinnedPath.confidenceScore || skinnedPath.confidenceScore < MIN_CONFIDENCE_PATH_SCORE) {
                return;
            }
            let path = new scope.Path({
                fillColor: skinnedPath.fillColor,
                strokeColor: skinnedPath.strokeColor,
                strokeWidth: skinnedPath.strokeWidth,
                closed: skinnedPath.closed,
            });
            skinnedPath.segments.forEach(seg => {
                path.addSegment(seg.point.currentPosition, 
                    seg.handleIn ? seg.handleIn.currentPosition.subtract(seg.point.currentPosition) : null,
                    seg.handleOut ? seg.handleOut.currentPosition.subtract(seg.point.currentPosition) : null);
            });
            if (skinnedPath.closed) {
                path.closePath();
            }
            scope.project.activeLayer.addChild(path);
        });
    }

    debugDraw() {
        let scope = this.scope;
        let group = new scope.Group();
        scope.project.activeLayer.addChild(group);
        let drawCircle = (p, opt = {}) => {
            group.addChild(new scope.Path.Circle({
                center: [p.x, p.y],
                radius: opt.radius || 2,
                fillColor: opt.fillColor || 'red',
            }));
        }
        let drawLine = (p0, p1, opt = {}) => {
            group.addChild(new scope.Path({
                segments: [p0, p1],
                strokeColor: opt.strokeColor || 'red',
                strokeWidth: opt.strokeWidth || 1
            }));
        }
        // Draw skeleton.
        this.skeleton.debugDraw(scope);
        // Draw curve and handles.
        this.skinnedPaths.forEach(skinnedPath => {
            skinnedPath.segments.forEach(seg => {
                // Color represents weight influence from bones.
                let color = new scope.Color(0);
                Object.keys(seg.point.skinning).forEach((boneName) => {
                    let bt = seg.point.skinning[boneName];
                    ColorUtils.addRGB(color, 
                        bt.weight * bt.bone.boneColor.red, 
                        bt.weight * bt.bone.boneColor.green, 
                        bt.weight * bt.bone.boneColor.blue);
                        let anchor = bt.bone.kp0.currentPosition.multiply(1 - bt.transform.anchorPerc).add(bt.bone.kp1.currentPosition.multiply(bt.transform.anchorPerc));
                        drawLine(anchor, seg.point.currentPosition, {strokeColor: 'blue', strokeWidth: bt.weight});
                });

                drawCircle(seg.point.currentPosition, {fillColor: color});
                drawCircle(seg.handleIn.currentPosition, {fillColor: color});
                drawLine(seg.point.currentPosition, seg.handleIn.currentPosition, {strokeColor: color});
                drawCircle(seg.handleOut.currentPosition, {fillColor: color}, {strokeColor: color});
                drawLine(seg.point.currentPosition, seg.handleOut.currentPosition);
            });
        });
    }

    debugDrawLabel(scope) {
        this.skeleton.debugDrawLabels(scope);
    }

    bindSkeleton(skeleton, skeletonScope) {
        let items = skeletonScope.project.getItems({ recursive: true });
        items = items.filter(item => item.parent && item.parent.name && item.parent.name.startsWith('illustration'));
        this.skeleton = skeleton;
        this.skinnedPaths = [];

        // Only support rendering path and shapes for now.
        for (let i = 0; i < items.length; i++) {
            let item = items[i];
            if (SVGUtils.isGroup(item)) {
                this.bindGroup(item, skeleton);
            } else if (SVGUtils.isPath(item)) {
                this.bindPathToBones(item);
            } else if (SVGUtils.isShape(item)) {
                this.bindPathToBones(item.toPath());
            }
        }
    }

    bindGroup(group, skeleton) {
        let paths = [];
        let keypoints = {};
        let items = group.getItems({recursive: true});
        // Find all paths and included keypoints.
        items.forEach(item => {
            let partName = item.name ? allPartNames.find(partName => item.name.startsWith(partName)) : null;
            if (partName) {
                keypoints[partName] = {
                    position: item.bounds.center,
                    name: partName,
                };
            } else if (SVGUtils.isPath(item)) {
                paths.push(item);
            } else if (SVGUtils.isShape(item)) {
                paths.push(item.toPath());
            }
        });
        let secondaryBones = [];
        // Find all parent bones of the included keypoints.
        let parentBones = skeleton.bones.filter(bone => keypoints[bone.kp0.name] && keypoints[bone.kp1.name]);
        let nosePos = skeleton.bNose3Nose4.kp1.position;
        if (!parentBones.length) {
            return;
        }

        // Crete secondary bones for the included keypoints.
        parentBones.forEach(parentBone => {
            let kp0 = keypoints[parentBone.kp0.name];
            let kp1 = keypoints[parentBone.kp1.name];
            let secondaryBone = new Bone().set(kp0, kp1, parentBone.skeleton, parentBone.type);
            kp0.transformFunc = MathUtils.getTransformFunc(parentBone.kp0.position, nosePos, kp0.position);
            kp1.transformFunc = MathUtils.getTransformFunc(parentBone.kp1.position, nosePos, kp1.position);
            secondaryBone.parent = parentBone;
            secondaryBones.push(secondaryBone);
        });        
        skeleton.secondaryBones = skeleton.secondaryBones.concat(secondaryBones);
        paths.forEach(path => {
            this.bindPathToBones(path, secondaryBones);
        });
    }

    // Assign weights from bones for point.
    // Weight calculation is roughly based on linear blend skinning model.
    getWeights(point, bones) {
        let totalW = 0;
        let weights = {};
        bones.forEach(bone => {
            let d = MathUtils.getClosestPointOnSegment(bone.kp0.position, bone.kp1.position, point)
                .getDistance(point);
            // Absolute weight = 1 / (distance * distance)
            let w = 1 / (d * d);
            weights[bone.name] = {
                value: w,
                bone: bone,
            }
        });

        let values = Object.values(weights).sort((v0, v1) => {
            return v1.value - v0.value;
        });
        weights = {};
        totalW = 0;
        values.forEach(v => {
            weights[v.bone.name] = v;
            totalW += v.value;
        });
        if (totalW === 0) {
            // Point is outside of the influence zone of all bones. It will not be influence by any bone.
            return {};
        }

        // Normalize weights to sum up to 1.
        Object.values(weights).forEach(weight => {
            weight.value /= totalW;
        });

        return weights;
    }

    // Binds a path to bones by compute weight contribution from each bones for each path segment.
    // If selectedBones are set, bind directly to the selected bones. Otherwise auto select the bone group closest to each segment.
    bindPathToBones(path, selectedBones) {
        // Compute bone weights for each segment.
        let segs = path.segments.map(s => {
            // Check if control points are collinear.
            // If so, use the middle point's weight for all three points (curve point, handleIn, handleOut).
            // This makes sure smooth curves remain smooth after deformation.
            let collinear = MathUtils.isCollinear(s.handleIn, s.handleOut);
            let bones = selectedBones || this.skeleton.findBoneGroup(s.point);
            let weightsP = this.getWeights(s.point, bones);
            let segment = {
                point: this.getSkinning(s.point, weightsP),
            };
            // For handles, compute transformation in world space.
            if (s.handleIn) {
                let pHandleIn = s.handleIn.add(s.point);
                segment.handleIn = this.getSkinning(pHandleIn, collinear ? weightsP : this.getWeights(pHandleIn, bones));
            }
            if (s.handleOut) {
                let pHandleOut = s.handleOut.add(s.point);
                segment.handleOut = this.getSkinning(pHandleOut, collinear ? weightsP : this.getWeights(pHandleOut, bones));
            }
            return segment;
        });
        this.skinnedPaths.push({
            segments: segs,
            fillColor: path.fillColor,
            strokeColor: path.strokeColor,
            strokeWidth: path.strokeWidth,
            closed: path.closed
        });
    }

    getSkinning(point, weights) {
        let skinning = {};
        Object.keys(weights).forEach(boneName => {
            skinning[boneName] = {
                bone: weights[boneName].bone,
                weight: weights[boneName].value,
                transform: weights[boneName].bone.getPointTransform(point),
            };
        });
        return {
            skinning: skinning,
            position: point,
            currentPosition: new this.scope.Point(0, 0),
        }
    };
}
