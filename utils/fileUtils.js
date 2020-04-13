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
