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

import * as paper from 'paper';

export class SVGUtils {
    static importSVG(file) {
        let svgScope = new paper.default.PaperScope();
        let canvas = svgScope.createCanvas(0, 0);
        svgScope.setup(canvas);
        return new Promise((resolve, reject) => {
            svgScope.project.importSVG(file, () => {
                console.log('** SVG imported **');
                resolve(svgScope);
            }, (e) => {
                console.log('** SVG improt error: ', e);
                reject(svgScope);
            });
        })
    }

    static drawEllipse(p, va, vb, ctrlDA, ctrlDB, scope, options) {
        let va1 = va.multiply(-1);
        let vb1 = vb.multiply(-1);
        let p0 = p.add(va);
        let p1 = p.add(vb);
        let p2 = p.add(va1);
        let p3 = p.add(vb1);
        let path = new scope.Path(options);
        path.addSegment(p0, vb1.normalize().multiply(ctrlDB), vb.normalize().multiply(ctrlDB));
        path.addSegment(p1, va.normalize().multiply(ctrlDA), va1.normalize().multiply(ctrlDA));
        path.addSegment(p2, vb.normalize().multiply(ctrlDB), vb1.normalize().multiply(ctrlDB));
        path.addSegment(p3, va1.normalize().multiply(ctrlDA), va.normalize().multiply(ctrlDA));
        path.closePath();
        return path;
    }

    static genPathWithSpline(path, spline, height, options, scope) {
        let pathLen = path.length;
        if (pathLen == 0) {
            return path.clone();
        }
        let to = [];
        let back = [];;
        let segCount = Math.max(pathLen / 3, 1.0);
        for (let i = 0; i < segCount; i++) {
            let perc = i / (segCount - 1);
            let p = path.getPointAt(perc * pathLen);
            let n = path.getNormalAt(perc * pathLen);
            let easeHeight = spline.get(perc);
            if (!p || !n) continue;
            let pp0 = p.add(n.multiply(height * easeHeight));
            let pp1 = p.subtract(n.multiply(height * easeHeight));
            to.push(pp0);
            back.unshift(pp1);
        }

        let outPath = new scope.Path(options);
        outPath.addSegments(to.concat(back));
        outPath.simplify();
        return outPath;
    }

    static isPath(item) {
        return item.constructor === item.project._scope.Path;
    }

    static isShape(item) {
        return item.constructor === item.project._scope.Shape;
    }

    static isGroup(item) {
        return item.constructor === item.project._scope.Group;
    }
    
    static findFirstItemWithPrefix(root, prefix) {
        let items = root.getItems({ recursive: true });
        for (let i = 0; i < items.length; i++) {
            if (items[i].name && items[i].name.startsWith(prefix)) {
            return items[i];
            }
        }
        return null;
    }
}
