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

export class FileUtils {
    static setDragDropHandler(handler) {
        window.addEventListener("dragover", function (e) {
            e = e || event;
            e.preventDefault();
          }, false);
          window.addEventListener("drop", function (e) {
            e = e || event;
            e.preventDefault();
            if (e.dataTransfer.items) {
              let files = e.dataTransfer.items;
              if (files.length < 1) {
                return;
              }
              let reader = new FileReader();
              reader.onload = (event) => {
                handler(event.target.result);
              }
              reader.readAsText(e.dataTransfer.files[0]);
            }
          }, false);
    }
}
