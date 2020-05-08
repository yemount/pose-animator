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

function getDistance(p0, p1) {
    return Math.sqrt((p0.x - p1.x) * (p0.x - p1.x) + (p0.y - p1.y) * (p0.y - p1.y));
}

export class MathUtils {
    static lerp(v0, v1, perc) {
        return v0 + (v1 - v0) * perc;
    }

    static random(v0, v1) {
        return v0 + Math.random() * (v1 - v0);
    }

    static smoothStep(v, min, max) {
        var x = Math.max(0, Math.min(1, (v-min)/(max-min)));
        return x*x*(3 - 2*x);
    }

    // Generate a transform function of p in the coordinate system defined by p0 and p1.
    static getTransformFunc(p0, p1, p) {
        let d = p1.subtract(p0);
        let dir = d.normalize();
        let l0 = d.length;
        let n = dir.clone();
        n.angle += 90;
        let v = p.subtract(p0);
        let x = v.dot(dir);
        let y = v.dot(n);
        return (p0New, p1New) => {
            let d = p1New.subtract(p0New);
            if (d.length === 0) {
                return p0New.clone();
            }
            let scale = d.length / l0;
            let dirNew = d.normalize();
            let nNew = dirNew.clone();
            nNew.angle += 90;
            return p0New.add(dirNew.multiply(x * scale)).add(nNew.multiply(y * scale));
        }
    }

    static getClosestPointOnSegment(p0, p1, p) {
        let d = p1.subtract(p0);
        let c = p.subtract(p0).dot(d) / (d.dot(d));
        if (c >= 1) {
            return p1.clone();
        } else if (c <= 0) {
            return p0.clone();
        } else {
            return p0.add(d.multiply(c));
        }
    }

    // Check if v0 and v1 are collinear.
    // Returns true if cosine of the angle between v0 and v1 is within threshold to 1.
    static isCollinear(v0, v1, threshold = 0.01) {
        let colinear = false;
        if (v0 && v1) {
            let n0 = v0.normalize();
            let n1 = v1.normalize();
            colinear = Math.abs(n0.dot(n1)) > 1 - threshold;
        }
        return colinear;
    }

    static gaussian(mean, variance) {
        var u = 0, v = 0;
        while(u === 0) u = Math.random(); //Converting [0,1) to (0,1)
        while(v === 0) v = Math.random();
        let value = Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
        return value * variance + mean;
    }

    static clamp(v, minV, maxV) {
        return Math.min(Math.max(v, minV), maxV);
    }

    static selectSegments(selectPerc, count, selectVar, segVar) {
        let segments = [];
        let totalSeg = 0;
        for (let i = 0; i < count; i++) {
            let seg = MathUtils.gaussian(1, segVar);
            segments.push(seg);
            totalSeg += seg;
        }
        for (let i = 0; i < segments.length; i++) {
            segments[i] = segments[i] / totalSeg;
        }
        let cursor = 0;
        let selected = [];
        for (let i = 0; i < count; i++) {
            let s0 = cursor;
            let s1 = cursor + segments[i] * MathUtils.clamp(MathUtils.gaussian(1, selectVar) * selectPerc, 0, 1);
            selected.push([s0, s1]);
            cursor += segments[i];
        }
        return selected;
    }

    static isLeft(p0, p1, p){
        return ((p1.x - p0.x)*(p.y - p0.y) - (p1.y - p0.y)*(p.x - p0.x)) > 0;
   }

    static packCircles(center, radius, seedCount, maxR, minR, maxIter = 10) {
        let circles = [];
        let iterCount = 0;
        while (circles.length < seedCount && iterCount < maxIter) {
            while (circles.length < seedCount) {
                let c = {
                    x: radius * (Math.random() * 2 - 1) + center.x,
                    y: radius * (Math.random() * 2 - 1) + center.y,
                };
                if (getDistance(c, center) > radius || circles.some(circle => getDistance(circle, c) < circle.radius)) continue;
                circles.push({
                    c: c,
                    r: 0,
                });
            }
            let growthIterCount = 20;
            let intersects = (c0, c1) => {
                let d = getDistance(c0.c, c1.c);
                return (d < c0.r + c1.r) && (d > Math.abs(c0.r - c1.r));
            }
            let bound = {
                c: center,
                r: radius,
            };
            for (let i = 0; i < growthIterCount; i++) {
                let grew = false;
                circles.forEach(s => {
                    let intersecting = circles.some(other => (s !== other) && (intersects(s, other) || intersects(s, bound)));
                    if (!intersecting && s.r < maxR) {
                        s.r += maxR / growthIterCount;
                        grew = true;
                    }
                });
                if (!grew) break;
            }
            circles = circles.filter(c => c.r >= minR);
            iterCount++;
        }
        return circles;
    }
}

class KeySpline {
    constructor(mX1, mY1, mX2, mY2) {
        this.mX1 = mX1;
        this.mY1 = mY1;
        this.mX2 = mX2;
        this.mY2 = mY2;
    }

    get(aX) {
        if (this.mX1 == this.mY1 && this.mX2 == this.mY2) return aX; // linear
        return this.CalcBezier(this.GetTForX(aX), this.mY1, this.mY2);
    }
    
    A( aA1,  aA2)  { return 1.0 - 3.0 * aA2 + 3.0 * aA1; }
    B( aA1,  aA2)  { return 3.0 * aA2 - 6.0 * aA1; }
    C( aA1)  { return 3.0 * aA1; }
    
    // Returns x(t) given t, x1, and x2, or y(t) given t, y1, and y2.
    CalcBezier( aT,  aA1,  aA2)  {
        return ((this.A(aA1, aA2) * aT + this.B(aA1, aA2)) * aT + this.C(aA1)) * aT;
    }
    
    // Returns dx/dt given t, x1, and x2, or dy/dt given t, y1, and y2.
    GetSlope( aT,  aA1,  aA2)  {
        return 3.0 * this.A(aA1, aA2) * aT * aT + 2.0 * this.B(aA1, aA2) * aT + this.C(aA1);
    }
    
    GetTForX( aX)  {
        // Newton raphson iteration
        let aGuessT = aX;
        for (let i = 0; i < 4; ++i) {
            let currentSlope = this.GetSlope(aGuessT, this.mX1, this.mX2);
            if (currentSlope == 0.0) return aGuessT;
            let currentX = this.CalcBezier(aGuessT, this.mX1, this.mX2) - aX;
            aGuessT -= currentX / currentSlope;
        }
        return aGuessT;
    }
};

export class MultiSpline {
    constructor() {
        this.keySplines = [];
        this.segments = [];
        this.x0 = 0;
        this.y0 = 0;
    }

    add(mX1, mY1, mX2, mY2, x1, y1) {
        let ks = new KeySpline(mX1, mY1, mX2, mY2);
        let x0 = this.x0;
        let y0 = this.y0;
        if (this.segments.length) {
            x0 = this.segments[this.segments.length - 1][1].x;
            y0 = this.segments[this.segments.length - 1][1].y;
        }
        this.keySplines.push(ks);
        this.segments.push([{x: x0, y: y0}, {x: x1, y: y1}]);
    }

    get(x) {
        let index = -1;
        for (let i = 0; i < this.segments.length; i++) {
            if (x >= this.segments[i][0].x && x < this.segments[i][1].x) {
                index = i;
                break;
            }
        }
        if (index < 0) {
            return 0;
        }
        let seg = this.segments[index];
        let ks = this.keySplines[index];
        let perc = (x - seg[0].x) / (seg[1].x - seg[0].x);
        if (index % 2 == 0) {
            return MathUtils.lerp(seg[0].y, seg[1].y, ks.get(perc));
        } else {
            return MathUtils.lerp(seg[1].y, seg[0].y, ks.get(1 - perc));
        }
    }
}
