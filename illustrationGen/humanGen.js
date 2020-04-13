import {SVGUtils} from './svgUtils';
import * as paper from 'paper';
import { MultiSpline, MathUtils } from '../utils/mathUtils';
import { facePalette, ColorUtils } from '../utils/colorUtils';

function getKeypoint(pose, name) {
    if (!pose || !pose.keypoints) {
        return null;
    }
    return pose.keypoints.find(kp => kp.part == name);
}

function toPoint(part, scope) {
    return new scope.Point(part.position.x, part.position.y);
}

// Face point to paper.Point
function fp2point(point, scope) {
    return new scope.Point(point);
}

function getStrokeSpline() {
    let spline = new MultiSpline();
    spline.add(.06,.51,.55,.99, 0.5, 1);
    spline.add(.06,.51,.55,.99, 1, 0);
    return spline;
}

export class HumanGen {
    constructor(scope, pose, face) {
        if (!face || !pose || !face.landmarks) {
            return;
        }
        this.scope = scope;
        this.params = this.genParams();
    }

    genParams() {
        // Hair
        let strandParams = [];
        let midPerc = MathUtils.gaussian(1, 0.1) * 0.2;
        let avgStrandPerc = 0.08;
        let hairLinePercHigh = MathUtils.gaussian(0.6, 0.05);
        let strandCount = Math.max(Math.floor(midPerc / avgStrandPerc), 1);
        for (let i = 0; i < strandCount; i++) {
            strandParams.push({
                tipCurveYHigh: MathUtils.gaussian(1, 0.2) * 0.2,
                tipCurveX: MathUtils.gaussian(1, 0.2),
                tipCurveYLow: MathUtils.gaussian(1, 0.2) * 0.1,
            });
        }
        let params = {
            faceColor: facePalette.select(0),
            hairMidPerc: midPerc,
            hairLeftPerc: MathUtils.clamp(
                0.5 + MathUtils.gaussian(1, 0.2) * 0.3 * (Math.random() < 0.5 ? -1 : 1) - midPerc / 2, 
                0.2, 
                1 - midPerc - 0.2),
            hairLinePercHigh: hairLinePercHigh,
            hairLinePercLow: MathUtils.gaussian(-0.1, 0.05),
            hairLeftOutCurveCtrl: MathUtils.gaussian(1, 0.1),
            hairRightInCurveCtrl: MathUtils.gaussian(1, 0.1),
            hairStrandCount: strandCount,
            hairStrandSegs: MathUtils.selectSegments(1, strandCount, 0, 0.2),
            hairStrandParams: strandParams,
            hairInLeftCtrlA: MathUtils.random(0, 1),
            hairInLeftCtrlB: -MathUtils.random(0, 1),
            hairOutRightCtrlA: -MathUtils.random(0, 1),
            hairOutRightCtrlB: -MathUtils.random(0, 1),
        };
        return params;
    }

    draw(pose, face) {
        if (!face || !face.landmarks) return;

        let scope = this.scope;
        let params = this.params;

        // Face
        let jawPoints = face.landmarks.getJawOutline();
        let j0 = fp2point(jawPoints[1], scope);
        let j1 = fp2point(jawPoints[Math.floor(jawPoints.length / 2)], scope);
        let j2 = fp2point(jawPoints[jawPoints.length - 2], scope);
        let mid = j0.add(j2).multiply(0.5);
        let va = j2.subtract(mid);
        let vb = j1.subtract(mid);
        let na = va.normalize();
        let nb = vb.normalize();
        vb = vb.normalize().multiply(Math.sqrt(vb.length) * va.length / Math.sqrt(va.length));
        mid = mid.add(vb.multiply(- 0.3));
        let ctrlDa = va.length / 2;
        let ctrlDb = vb.length * 0.7;
        let faceLine = SVGUtils.drawEllipse(mid, va, vb, ctrlDa, ctrlDb, scope, {
            fillColor: params.faceColor.light,
        });
        // Blush
        let rBlush = va.length * 0.13;
        SVGUtils.drawEllipse(mid.add(va.multiply(0.5)).add(vb.multiply(0.35)),
            na.multiply(rBlush), nb.multiply(rBlush), rBlush / 2, rBlush / 2, scope, {fillColor: '#E58382'});
        SVGUtils.drawEllipse(mid.add(va.multiply(-0.5)).add(vb.multiply(0.35)),
            na.multiply(rBlush), nb.multiply(rBlush), rBlush / 2, rBlush / 2, scope, {fillColor: '#E58382'});

        // Left eye
        let lEyes = face.landmarks.getLeftEye();
        let el0 = fp2point(lEyes[0], scope);
        let el1 = fp2point(lEyes[3], scope);
        let elMid = el0.add(el1).multiply(0.5);
        let elVa = el0.subtract(elMid)
        let elVb = elVa.clone();
        elVb.angle += 90;
        this.genEye(scope, elMid, elVa.multiply(0.3), elVb.multiply(0.6), params.faceColor);

        // Right eye
        let rEyes = face.landmarks.getRightEye();
        let er0 = fp2point(rEyes[0], scope);
        let er1 = fp2point(rEyes[3], scope);
        let erMid = er0.add(er1).multiply(0.5);
        let erVa = er0.subtract(erMid);
        let erVb = erVa.clone();
        erVb.angle += 90;
        this.genEye(scope, erMid, erVa.multiply(0.3), erVb.multiply(0.6), params.faceColor);
        
        // Nose
        let nose = face.landmarks.getNose().map(p => fp2point(p, scope));
        let noseTop = nose[0];
        let noseBottom = nose[6];
        let noseL = nose[4];
        let noseR = nose[8];
        let useLeft = noseL.getDistance(noseBottom) > noseR.getDistance(noseBottom);
        let noseSide = useLeft ? noseL : noseR;
        let noseOffset = noseTop.subtract(noseBottom).divide(2);
        noseBottom = noseBottom.add(noseOffset);
        let noseBottom1 = (useLeft ? nose[7] : nose[5]).add(noseOffset);
        noseSide = noseSide.add(noseOffset);
        let path = new scope.Path({insert:false});
        path.addSegment(noseTop, null, noseBottom1.subtract(noseTop));
        path.addSegment(noseSide, noseBottom1.subtract(noseSide), null);
        SVGUtils.genPathWithSpline(path, getStrokeSpline(), 1.5, {
            fillColor: params.faceColor.dark,
        }, scope);

        // Left eyebrow
        let lBrows = face.landmarks.getLeftEyeBrow();
        lBrows = lBrows.map(p_ => {
            let p = fp2point(p_, scope);
            let d = p.subtract(elMid);
            return elMid.add(d.multiply(0.8));
        });
        this.genEyeBrow(lBrows, scope, params.faceColor);

        // Right eyebrow
        let rBrows = face.landmarks.getRightEyeBrow();
        rBrows = rBrows.map(p_ => {
            let p = fp2point(p_, scope);
            let d = p.subtract(erMid);
            return erMid.add(d.multiply(0.8));
        });
        this.genEyeBrow(rBrows, scope, params.faceColor);

        // Mouth
        let mouth = face.landmarks.getMouth();
        let mouthPoints = [mouth[0], mouth[19], mouth[18], mouth[17], mouth[6]].map(p => {
            let mid = mouth[18];
            let mouthOffset = noseBottom.subtract(mid).multiply(0.6);
            return new scope.Point(p).add(mouthOffset);
        });
        mouthPoints = mouthPoints.map(p => {
            let mid = mouthPoints[Math.floor(mouthPoints.length / 2)];
            let d = p.subtract(mid);
            return mid.add(d.normalize().multiply(d.length * 0.5));
        });
        let mouthPath = new scope.Path({
            segments: mouthPoints,
        });
        mouthPath.smooth();
        SVGUtils.genPathWithSpline(mouthPath, getStrokeSpline(), 2, {fillColor: params.faceColor.dark}, scope);

        // Hair
        this.genHair(scope, params, mid, va, vb, ctrlDa, ctrlDb);
        
        let bodyGroup = new scope.Group();
        bodyGroup.sendToBack();
        // Torso
        this.genTorso(scope, bodyGroup, faceLine, pose, params);
        // Neck
        this.genNeck(scope, bodyGroup, faceLine, pose, params);
    }

    genEye(scope, p, va, vb, faceColor) {
        SVGUtils.drawEllipse(p, va, vb, va.length / 2, vb.length * 0.6, scope, {
            fillColor: faceColor.dark,
        });
    }

    genTorso(scope, group, faceLine, pose, params) {
        let lShoulder0 = toPoint(getKeypoint(pose, 'leftShoulder'), scope);
        let rShoulder0 = toPoint(getKeypoint(pose, 'rightShoulder'), scope);
        let lShoulder = rShoulder0.multiply(1/3).add(lShoulder0.multiply(2/3));
        let rShoulder = lShoulder0.multiply(1/3).add(rShoulder0.multiply(2/3));
        let lHip0 = toPoint(getKeypoint(pose, 'leftHip'), scope);
        let rHip0 = toPoint(getKeypoint(pose, 'rightHip'), scope);
        let lHip = lHip0.add(lHip0.subtract(rHip0).multiply(0.5));
        let rHip = rHip0.add(rHip0.subtract(lHip0).multiply(0.5));
        let center = lShoulder.add(rShoulder).add(lHip).add(rHip).divide(4);
        
        let path = new scope.Path({
            fillColor: params.faceColor.dark
        });

        let dHip = lHip.subtract(rHip).length;
        let nHip = rHip.subtract(lHip).normalize();
        nHip.angle += 90;
        let hipIn = nHip.clone().multiply(dHip * 0.25);
        let hipOut = nHip.clone().multiply(-dHip * 0.25);
        // Sanity check to make sure hip handles always go up.
        if (hipIn.dot(lHip.subtract(lShoulder)) > 0) hipIn.angle += 180;
        if (hipOut.dot(rHip.subtract(rShoulder)) > 0) hipOut.angle += 180;
        let mid = lShoulder.add(rShoulder).multiply(0.5);
        let top = center.add(mid.subtract(center).multiply(1.7));
        let topIn = rHip.subtract(lHip).normalize().multiply(dHip * 0.5);
        let topOut = topIn.clone();
        topOut.angle += 180;
        path.addSegment(top, topIn, topOut);
        path.addSegment(lHip, hipIn, null);
        path.addSegment(rHip, null, hipOut);
        path.closePath();
        group.addChild(path);
    }

    genNeck(scope, group, faceLine, pose, params) {
        let dPerc = 0.04
        let neck0 = faceLine.getPointAt(faceLine.length * (0.25 - dPerc));
        let neck1 = faceLine.getPointAt(faceLine.length * (0.25 + dPerc));
        let lShoulder = toPoint(getKeypoint(pose, 'leftShoulder'), scope);
        let rShoulder = toPoint(getKeypoint(pose, 'rightShoulder'), scope);
        let center = neck0.add(neck1).add(lShoulder).add(rShoulder).divide(4);
        neck0 = center.add(neck0.subtract(center).multiply(1.1));
        neck1 = center.add(neck1.subtract(center).multiply(1.1));
        let neck2 = lShoulder.multiply(1/3).add(rShoulder.multiply(2/3));
        let neck3 = rShoulder.multiply(1/3).add(lShoulder.multiply(2/3));
        if (MathUtils.isLeft(neck1, neck2, neck0) != MathUtils.isLeft(neck1, neck2, neck3)) {
            let temp = neck2;
            neck2 = neck3;
            neck3 = temp;
        }
        neck2 = neck1.add(neck2.subtract(neck1).multiply(0.8));
        neck3 = neck0.add(neck3.subtract(neck0).multiply(0.8));

        let path = new scope.Path({
            // segments: [neck0, neck1, neck2, neck3],
            fillColor: params.faceColor.light
        });
        path.addSegment(neck0);
        path.addSegment(neck1);
        let neckCtrlD = neck0.subtract(neck1).length / 2;
        path.addSegment(neck2, null, neck3.subtract(neck0).normalize().multiply(neckCtrlD));
        path.addSegment(neck3, neck2.subtract(neck1).normalize().multiply(neckCtrlD), null);
        path.closePath();

        let lMid = neck3.multiply(0.2).add(neck0.multiply(0.8));
        let rMid = neck2.multiply(0.5).add(neck1.multiply(0.5));
        let shadowCtrlD = lMid.subtract(rMid).length / 2;
        let lMidOut = neck2.multiply(0.5).add(neck1.multiply(0.5)).subtract(lMid).normalize().multiply(shadowCtrlD);
        let rMidIn = neck3.multiply(0.5).add(neck0.multiply(0.5)).subtract(rMid).normalize().multiply(shadowCtrlD);
        let shadowPath = new scope.Path({
            fillColor: ColorUtils.lerp(params.faceColor.dark, params.faceColor.light, 0.85),
        });
        shadowPath.addSegment(neck0);
        shadowPath.addSegment(lMid, null, null);
        shadowPath.addSegment(rMid, rMidIn, null);
        shadowPath.addSegment(neck1);

        group.addChild(path);
        group.addChild(shadowPath);
    }

    genEyeBrow(points, scope, faceColor) {
        let path = new scope.Path({
            segments: points,
            insert:false
        });
        path.smooth();
        SVGUtils.genPathWithSpline(path, getStrokeSpline(), 1.5, {
            fillColor: faceColor.dark
        }, scope);
    }

    genHair(scope, params, center, va, vb, ctrlDa, ctrlDb) {
        let midPerc = params.hairMidPerc;
        let leftPerc = params.hairLeftPerc;
        let rightPerc = leftPerc + midPerc;
        let hairLinePercHigh = params.hairLinePercHigh;
        let hairLinePercLow = params.hairLinePercLow;
        let getP = (xPerc, yPerc) => {
            return center.add(va.multiply(MathUtils.lerp(-1, 1, xPerc))
                .add(vb.multiply(MathUtils.lerp(0, -1, yPerc))));
        }

        let pl0 = getP(leftPerc, hairLinePercHigh);
        let pl1 = getP(-0.05, hairLinePercLow);
        let pr0 = getP(rightPerc, hairLinePercHigh);
        let pr1 = getP(1.05, hairLinePercLow);
        let path = new scope.Path({
            fillColor: params.faceColor.dark
        });
        let nb = vb.normalize();
        let na = va.normalize();
        let avgStrandCtrlDB = vb.length * 0.3;
        let avgStrandCtrlDA = va.length / vb.length * avgStrandCtrlDB;
        let ctrlInL = na.multiply(params.hairInLeftCtrlA).add(nb.multiply(params.hairInLeftCtrlB)).normalize();
        let ctrlOutR = na.multiply(params.hairOutRightCtrlA).add(nb.multiply(params.hairOutRightCtrlB)).normalize();
        path.addSegment(pl0, null, nb.multiply(params.hairLeftOutCurveCtrl * avgStrandCtrlDB));
        path.addSegment(pl1, ctrlInL.multiply(avgStrandCtrlDA), nb.multiply(-ctrlDb));
        path.addSegment(center.add(vb.multiply(-1.1)), na.multiply(-ctrlDa), va.normalize().multiply(ctrlDa));
        path.addSegment(pr1, vb.normalize().multiply(-ctrlDb), ctrlOutR.multiply(avgStrandCtrlDA));
        path.addSegment(pr0, nb.multiply(params.hairRightInCurveCtrl * avgStrandCtrlDB), null);

        // small hair strands
        // let strandCount = params.hairStrandCount;
        let strandSegs = params.hairStrandSegs;
        let strandParams = params.hairStrandParams;
        for (let i = 0; i < strandSegs.length; i++) {
            let hPercTip = hairLinePercHigh - strandParams[i].tipCurveYHigh;
            let perc0 = MathUtils.lerp(rightPerc, leftPerc, strandSegs[i][0]);
            let perc1 = MathUtils.lerp(rightPerc, leftPerc, strandSegs[i][1]);
            let ctrlD = strandParams[i].tipCurveX * Math.abs(perc1 - perc0) * va.length;
            let p0 = getP(perc0, hairLinePercHigh);
            let p1 = getP(perc1, hairLinePercHigh);
            let percTip = (perc0 + perc1) * 0.5 - strandParams[i].tipCurveYLow;
            let pTip = getP(percTip, hPercTip);
            path.addSegment(p0, null, nb.multiply(ctrlD));
            path.addSegment(pTip, na.multiply(ctrlD), na.multiply(ctrlD));
            path.addSegment(p1, nb.multiply(ctrlD * 0.5), null);
        }
        path.closePath();
    }
}
