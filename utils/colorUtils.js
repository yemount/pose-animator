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

import {MathUtils} from './mathUtils';
import * as paper from 'paper';

export class Palette {
    constructor(colors) {
        let scope = paper.default;
        this.colors = colors.map(c => ({
            light: new scope.Color(c[0]).convert('hsb'),
            dark: new scope.Color(c[1]).convert('hsb'),
        }));
    }

    select(variance) {
        let scope = paper.default;
        let pair = this.colors[Math.floor(Math.random() * this.colors.length)];
        let varColor = (c) => new scope.Color({
            hue: c.hue + 360 * MathUtils.gaussian(0, variance),
            saturation: c.saturation + MathUtils.gaussian(0, variance),
            brightness: c.brightness + MathUtils.gaussian(0, variance),
        });
        return {
            light: varColor(pair.light),
            dark: varColor(pair.dark),
        };
    }
}

export class ColorUtils {
    static addRGB(color, red, green, blue) {
        color.red = color.red + red;
        color.green = color.green + green;
        color.blue = color.blue + blue;
    }

    static lerp(color0, color1, amt) {
        return new paper.default.Color(
            MathUtils.lerp(color0.red, color1.red, amt),
            MathUtils.lerp(color0.green, color1.green, amt),
            MathUtils.lerp(color0.blue, color1.blue, amt),
        );
    }

    // Generates random color from string hash.
    static fromStringHash(str) {
        // Compute hash from string
        // Source http://werxltd.com/wp/2010/05/13/javascript-implementation-of-javas-string-hashcode-method/
        var hash = 0, i, chr;
        for (i = 0; i < str.length; i++) {
        chr   = str.charCodeAt(i);
        hash  = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
        }
        // Hash to rgb color.
        let r = hash & 255;
        let g = (hash & (255 << 8)) >> 8;
        let b = (hash & (255 << 16)) >> 16;
        return new paper.default.Color(r / 255, g / 255, b / 255);
    }
}
