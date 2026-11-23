// ../../downloads/image-studio-4k/src.js
var $ = (id) => document.getElementById(id);
var source = null;
var file = null;
var outURL = null;
var srcURL = null;
var worker;
var bytes = (n) => n < 1048576 ? (n / 1024).toFixed(0) + " KB" : (n / 1048576).toFixed(2) + " MB";
function status(t) {
  $("status").textContent = t;
}
$("quality").oninput = () => {
  $("qualityLabel").textContent = $("quality").value + "%";
};
$("method").onchange = () => {
  const ai = $("method").value === "ai";
  $("scale").disabled = ai;
  $("strengthWrap").hidden = !ai;
  if (ai) $("scale").value = "2";
  $("methodNote").textContent = ai ? "\u062A\u0643\u0628\u064A\u0631 \u0645\u062A\u0639\u0644\u0651\u0645 \xD7\u0662. \u0645\u0645\u0643\u0646 \u064A\u062E\u0645\u0651\u0646 \u062A\u0641\u0627\u0635\u064A\u0644 \u0623\u0648 \u064A\u063A\u064A\u0651\u0631 \u0645\u0644\u0645\u0633 \u0627\u0644\u0635\u0648\u0631\u0629. \u0644\u0644\u0623\u0635\u0644 \u062D\u062A\u0649 \u0665 \u0645\u064A\u062C\u0627\u0628\u0643\u0633\u0644. \u0627\u0644\u0645\u0639\u0627\u0644\u062C\u0629 \u0639\u0644\u0649 \u0623\u062C\u0632\u0627\u0621 \u0645\u0646 \u063A\u064A\u0631 \u062A\u0635\u063A\u064A\u0631 \u0627\u0644\u0623\u0635\u0644\u060C \u0648\u0642\u062F \u062A\u0633\u062A\u063A\u0631\u0642 \u062F\u0642\u0627\u0626\u0642 \u0637\u0648\u064A\u0644\u0629. \u062A\u0642\u062F\u0631 \u062A\u0644\u063A\u064A\u0647\u0627." : "\u0627\u0644\u062A\u0643\u0628\u064A\u0631 \u0627\u0644\u0633\u0631\u064A\u0639 \u0628\u064A\u062D\u0633\u0651\u0646 \u0639\u0631\u0636 \u0627\u0644\u0635\u0648\u0631\u0629 \u0627\u0644\u0643\u0628\u064A\u0631\u0629 \u0628\u062D\u062F\u0629 \u062E\u0641\u064A\u0641\u0629\u060C \u0645\u0634 \u0628\u064A\u0633\u062A\u0631\u062C\u0639 \u062A\u0641\u0627\u0635\u064A\u0644 \u0645\u0641\u0642\u0648\u062F\u0629. \u0627\u0644\u0636\u063A\u0637 \u0645\u0645\u0643\u0646 \u064A\u0642\u0644\u0644 \u0628\u0639\u0636 \u0627\u0644\u062A\u0641\u0627\u0635\u064A\u0644.";
};
var selectionVersion = 0;
async function snapshotFile(f) {
  let last;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const b = await f.arrayBuffer();
      if (b.byteLength) return new Blob([b], { type: f.type || "application/octet-stream" });
    } catch (e) {
      last = e;
    }
    await new Promise((r) => setTimeout(r, 150 * (attempt + 1)));
  }
  try {
    const data = await readDataURL(f);
    return await (await fetch(data)).blob();
  } catch {
  }
  throw Error("\u0645\u0634 \u0642\u0627\u062F\u0631 \u0623\u0642\u0631\u0623 \u0627\u0644\u0645\u0644\u0641 \u0645\u0646 \u0645\u0643\u0627\u0646\u0647. \u0646\u0632\u0651\u0644 \u0627\u0644\u0635\u0648\u0631\u0629 \u0628\u0627\u0644\u0643\u0627\u0645\u0644 \u0641\u064A Downloads\u060C \u0648\u0628\u0639\u062F\u0647\u0627 \u0627\u062E\u062A\u0627\u0631 \u0627\u0644\u0646\u0633\u062E\u0629 \u0627\u0644\u0645\u062D\u0641\u0648\u0638\u0629 \u0639\u0644\u0649 \u0627\u0644\u062C\u0647\u0627\u0632.");
}
function readDataURL(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(Error("\u062A\u0639\u0630\u0631 \u0642\u0631\u0627\u0621\u0629 \u0645\u0644\u0641 \u0627\u0644\u0635\u0648\u0631\u0629 \u0645\u0646 \u0627\u0644\u062C\u0647\u0627\u0632. \u0646\u0632\u0651\u0644\u0647 \u0628\u0627\u0644\u0643\u0627\u0645\u0644 \u0648\u0627\u062E\u062A\u0627\u0631\u0647 \u062A\u0627\u0646\u064A."));
    r.readAsDataURL(blob);
  });
}
function loadImageURL(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const timer = setTimeout(() => {
      img.onload = img.onerror = null;
      reject(Error("\u0627\u0646\u062A\u0647\u0649 \u0648\u0642\u062A \u0642\u0631\u0627\u0621\u0629 \u0627\u0644\u0635\u0648\u0631\u0629. \u062C\u0631\u0651\u0628 \u0627\u062E\u062A\u064A\u0627\u0631\u0647\u0627 \u062A\u0627\u0646\u064A."));
    }, 3e4);
    img.onload = () => {
      clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timer);
      reject(Error("\u0627\u0644\u0645\u062A\u0635\u0641\u062D \u0645\u0627 \u0642\u062F\u0631\u0634 \u064A\u0642\u0631\u0623 \u0627\u0644\u0635\u0648\u0631\u0629 \u062F\u064A. \u062C\u0631\u0651\u0628 \u0646\u0633\u062E\u0629 JPEG \u0623\u0648 PNG \u0645\u062D\u0641\u0648\u0638\u0629 \u0639\u0644\u0649 \u0627\u0644\u062C\u0647\u0627\u0632."));
    };
    img.src = url;
  });
}
$("file").onchange = async () => {
  const version = ++selectionVersion;
  const f = $("file").files[0];
  if (!f) return;
  $("result").hidden = true;
  $("run").disabled = true;
  source = null;
  $("source").textContent = "\u062C\u0627\u0631\u064A \u0642\u0631\u0627\u0621\u0629 \u0627\u0644\u0635\u0648\u0631\u0629...";
  status("\u062C\u0627\u0631\u064A \u0642\u0631\u0627\u0621\u0629 \u0645\u0644\u0641 \u0627\u0644\u0635\u0648\u0631\u0629 \u0645\u0646 \u0627\u0644\u062C\u0647\u0627\u0632...");
  if (f.size > 20 * 1048576) {
    $("source").textContent = "\u0627\u0644\u0635\u0648\u0631\u0629 \u0644\u0633\u0647 \u0645\u0627 \u0627\u062A\u0627\u062E\u062A\u0627\u0631\u062A\u0634";
    status("\u0627\u062E\u062A\u0627\u0631 \u0635\u0648\u0631\u0629 \u0623\u0635\u063A\u0631 \u0645\u0646 \u0662\u0660 \u0645\u064A\u062C\u0627\u0628\u0627\u064A\u062A.");
    return;
  }
  try {
    const blob = await snapshotFile(f);
    let decoded = null;
    let preview = null;
    if (typeof createImageBitmap === "function") {
      try {
        decoded = await createImageBitmap(blob);
      } catch {
      }
    }
    if (!decoded) {
      preview = await readDataURL(blob);
      decoded = await loadImageURL(preview);
    }
    if (version !== selectionVersion) {
      decoded.close?.();
      return;
    }
    if (decoded.width * decoded.height > 2e7) {
      decoded.close?.();
      throw Error("\u0627\u0644\u0635\u0648\u0631\u0629 \u0623\u0643\u0628\u0631 \u0645\u0646 \u062D\u062F \u0662\u0660 \u0645\u064A\u062C\u0627\u0628\u0643\u0633\u0644.");
    }
    if (!preview) preview = await readDataURL(blob);
    if (version !== selectionVersion) {
      decoded.close?.();
      return;
    }
    if (srcURL && srcURL.startsWith("blob:")) URL.revokeObjectURL(srcURL);
    source = decoded;
    file = f;
    srcURL = preview;
    $("before").src = preview;
    $("source").textContent = decoded.width + " \xD7 " + decoded.height + " | " + bytes(f.size);
    $("run").disabled = false;
    status("\u062C\u0627\u0647\u0632\u0629. \u0627\u062E\u062A\u0627\u0631 \u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0648\u0627\u0628\u062F\u0623.");
    updateSizeChoices();
  } catch (e) {
    if (version !== selectionVersion) return;
    source = null;
    $("source").textContent = "\u062A\u0639\u0630\u0631 \u0642\u0631\u0627\u0621\u0629 \u0627\u0644\u0635\u0648\u0631\u0629";
    status(e.message || "\u0627\u0644\u0635\u0648\u0631\u0629 \u062F\u064A \u0645\u0634 \u0645\u062F\u0639\u0648\u0645\u0629.");
  }
};
function outputSize(value) {
  const factor = value === "4k" ? 3840 / Math.max(source.width, source.height) : Number(value);
  return { width: Math.round(source.width * factor), height: Math.round(source.height * factor), factor };
}
function sharpen(canvas) {
  const c = canvas.getContext("2d", { willReadFrequently: true }), a = c.getImageData(0, 0, canvas.width, canvas.height), s = a.data, d = new Uint8ClampedArray(s), w = canvas.width, h = canvas.height;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    let i = (y * w + x) * 4;
    for (let k = 0; k < 3; k++) {
      let edge = s[i + k] - (s[i - 4 + k] + s[i + 4 + k] + s[i - w * 4 + k] + s[i + w * 4 + k]) / 4;
      if (Math.abs(edge) > 3) d[i + k] = s[i + k] + edge * 0.15;
    }
  }
  a.data.set(d);
  c.putImageData(a, 0, 0);
}
$("run").onclick = async () => {
  if (!source) return;
  $("run").disabled = true;
  $("result").hidden = true;
  for (const el of document.querySelectorAll("input,select,#clear")) el.disabled = true;
  try {
    const ai = $("method").value === "ai", size = outputSize(ai ? "2" : $("scale").value), scale = size.factor;
    if (size.width * size.height > 2e7) throw Error("\u0627\u0644\u0645\u0642\u0627\u0633 \u0627\u0644\u0646\u0627\u062A\u062C \u0623\u0643\u0628\u0631 \u0645\u0646 \u0662\u0660 \u0645\u064A\u062C\u0627\u0628\u0643\u0633\u0644. \u0627\u062E\u062A\u0627\u0631 \u062A\u0643\u0628\u064A\u0631 \u0623\u0642\u0644 \u0623\u0648 \u0635\u0648\u0631\u0629 \u0623\u0635\u063A\u0631.");
    if (ai && source.width * source.height > 5e6) throw Error("\u0627\u0644\u0648\u0636\u0639 \u0627\u0644\u0630\u0643\u064A \u0641\u064A \u0627\u0644\u0646\u0633\u062E\u0629 \u062F\u064A \u064A\u0642\u0628\u0644 \u0644\u062D\u062F \u0665 \u0645\u064A\u062C\u0627\u0628\u0643\u0633\u0644. \u0627\u062E\u062A\u0627\u0631 \u0635\u0648\u0631\u0629 \u0623\u0635\u063A\u0631 \u0623\u0648 \u0627\u0644\u062A\u0643\u0628\u064A\u0631 \u0627\u0644\u0633\u0631\u064A\u0639.");
    status(ai ? "\u062C\u0627\u0631\u064A \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u0645\u0648\u062F\u064A\u0644 \u0648\u0627\u0644\u0645\u0639\u0627\u0644\u062C\u0629 \u0639\u0644\u0649 \u062C\u0647\u0627\u0632\u0643..." : "\u062C\u0627\u0631\u064A \u0627\u0644\u062A\u0643\u0628\u064A\u0631 \u0648\u0627\u0644\u0636\u063A\u0637...");
    await new Promise((r) => setTimeout(r, 30));
    let canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    let ctx = canvas.getContext("2d");
    if (ai) {
      const input = document.createElement("canvas");
      input.width = source.width;
      input.height = source.height;
      input.getContext("2d").drawImage(source, 0, 0);
      const pixels = input.getContext("2d").getImageData(0, 0, input.width, input.height).data;
      input.width = input.height = 1;
      const output = await new Promise((resolve, reject) => {
        worker = new Worker(new URL("./worker.js", document.baseURI), { type: "module" });
        $("cancel").hidden = false;
        const timer = setTimeout(() => {
          worker.terminate();
          reject(Error("\u0627\u0646\u062A\u0647\u0649 \u062D\u062F \u0662\u0660 \u062F\u0642\u064A\u0642\u0629 \u0639\u0644\u0649 \u0647\u0630\u0627 \u0627\u0644\u062C\u0647\u0627\u0632\u060C \u0645\u0646 \u063A\u064A\u0631 \u0646\u062A\u064A\u062C\u0629 \u0623\u0648 \u062A\u0635\u063A\u064A\u0631 \u062E\u0641\u064A."));
        }, 12e5);
        $("cancel").onclick = () => {
          worker.terminate();
          clearTimeout(timer);
          reject(Error("\u062A\u0645 \u0625\u0644\u063A\u0627\u0621 \u0627\u0644\u0645\u0639\u0627\u0644\u062C\u0629."));
        };
        worker.onerror = (e) => {
          clearTimeout(timer);
          worker.terminate();
          reject(Error(e.message));
        };
        worker.onmessage = ({ data: m }) => {
          if (m.type === "progress") status(m.text);
          else {
            clearTimeout(timer);
            worker.terminate();
            if (m.type === "error") reject(Error(m.text));
            else resolve(new Uint8ClampedArray(m.pixels));
          }
        };
        worker.postMessage({ width: source.width, height: source.height, resume: $("resume").checked, pixels: pixels.buffer }, [pixels.buffer]);
      });
      const detail = Number($("detail").value) / 100;
      if (detail > 0) {
        const base = document.createElement("canvas");
        base.width = canvas.width;
        base.height = canvas.height;
        const bc = base.getContext("2d");
        bc.drawImage(source, 0, 0, base.width, base.height);
        const original = bc.getImageData(0, 0, base.width, base.height).data;
        base.width = base.height = 1;
        const mixed = await new Promise((resolve, reject) => {
          worker = new Worker(new URL("./detail-worker.js", document.baseURI));
          $("cancel").hidden = false;
          const timer = setTimeout(() => {
            worker.terminate();
            reject(Error("\u0627\u0646\u062A\u0647\u0649 \u0648\u0642\u062A \u062F\u0645\u062C \u0627\u0644\u062A\u0641\u0627\u0635\u064A\u0644."));
          }, 12e4);
          $("cancel").onclick = () => {
            clearTimeout(timer);
            worker.terminate();
            reject(Error("\u062A\u0645 \u0625\u0644\u063A\u0627\u0621 \u0627\u0644\u0645\u0639\u0627\u0644\u062C\u0629."));
          };
          worker.onerror = (e) => {
            clearTimeout(timer);
            worker.terminate();
            reject(Error(e.message));
          };
          worker.onmessage = ({ data: m }) => {
            if (m.type === "progress") status("\u062F\u0645\u062C \u062A\u0641\u0627\u0635\u064A\u0644 \u0627\u0644\u0623\u0635\u0644: " + Math.round(m.done / m.total * 100) + "%");
            else {
              clearTimeout(timer);
              worker.terminate();
              if (m.type === "error") reject(Error(m.text));
              else resolve(new Uint8ClampedArray(m.pixels));
            }
          };
          worker.postMessage({ width: canvas.width, height: canvas.height, amount: detail, learned: output.buffer, original: original.buffer }, [output.buffer, original.buffer]);
        });
        ctx.putImageData(new ImageData(mixed, canvas.width, canvas.height), 0, 0);
      } else ctx.putImageData(new ImageData(output, canvas.width, canvas.height), 0, 0);
      const strength = Number($("strength").value) / 100;
      if (strength < 1) {
        ctx.globalAlpha = 1 - strength;
        ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1;
      }
    } else {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
      if (scale > 1) sharpen(canvas);
    }
    const fmt = $("format").value;
    if (fmt === "image/jpeg") {
      const flat = document.createElement("canvas");
      flat.width = canvas.width;
      flat.height = canvas.height;
      const fc = flat.getContext("2d");
      fc.fillStyle = "#fff";
      fc.fillRect(0, 0, flat.width, flat.height);
      fc.drawImage(canvas, 0, 0);
      canvas = flat;
    }
    const blob = await new Promise((r) => canvas.toBlob(r, fmt, Number($("quality").value) / 100));
    if (!blob) throw Error("\u0627\u0644\u0645\u062A\u0635\u0641\u062D \u0645\u0627 \u0642\u062F\u0631\u0634 \u064A\u062D\u0641\u0638 \u0627\u0644\u0645\u0642\u0627\u0633 \u062F\u0647. \u062C\u0631\u0651\u0628 \u0645\u0642\u0627\u0633 \u0623\u0635\u063A\u0631.");
    if (outURL) URL.revokeObjectURL(outURL);
    outURL = URL.createObjectURL(blob);
    $("after").src = outURL;
    $("download").href = outURL;
    const ext = blob.type.split("/")[1].replace("jpeg", "jpg");
    $("download").download = "enhanced-image." + ext;
    const diff = (1 - blob.size / file.size) * 100;
    $("stats").replaceChildren();
    for (const t of [canvas.width + " \xD7 " + canvas.height, bytes(blob.size), (diff >= 0 ? "\u0623\u0635\u063A\u0631 \u0645\u0646 \u0627\u0644\u0623\u0635\u0644 \u0628\u0646\u0633\u0628\u0629 " : "\u0623\u0643\u0628\u0631 \u0645\u0646 \u0627\u0644\u0623\u0635\u0644 \u0628\u0646\u0633\u0628\u0629 ") + Math.abs(diff).toFixed(1) + " \u0628\u0627\u0644\u0645\u0626\u0629"]) {
      const span = document.createElement("span");
      span.textContent = t;
      $("stats").append(span);
    }
    $("result").hidden = false;
    status("\u062E\u0644\u0635\u062A. \u0627\u0644\u0646\u062A\u064A\u062C\u0629 \u062C\u0627\u0647\u0632\u0629 \u0644\u0644\u0645\u0642\u0627\u0631\u0646\u0629 \u0648\u0627\u0644\u062A\u0646\u0632\u064A\u0644.");
    canvas.width = canvas.height = 1;
  } catch (e) {
    status("\u0645\u0627 \u0643\u0645\u0644\u062A\u0634: " + (e.message || "\u062E\u0637\u0623 \u063A\u064A\u0631 \u0645\u062A\u0648\u0642\u0639. \u062C\u0631\u0651\u0628 \u0635\u0648\u0631\u0629 \u0623\u0635\u063A\u0631."));
  } finally {
    $("run").disabled = false;
    $("cancel").hidden = true;
    for (const el of document.querySelectorAll("input,select,#clear")) el.disabled = false;
    $("scale").disabled = $("method").value === "ai";
  }
};
$("clear").onclick = () => {
  const r = indexedDB.deleteDatabase("image-studio-ai-checkpoints");
  r.onsuccess = () => status("\u062A\u0645 \u0645\u0633\u062D \u0623\u062C\u0632\u0627\u0621 \u0627\u0644\u0645\u0639\u0627\u0644\u062C\u0629 \u0627\u0644\u0645\u062D\u0641\u0648\u0638\u0629.");
  r.onblocked = () => status("\u0623\u0644\u063A\u064A \u0623\u064A \u0645\u0639\u0627\u0644\u062C\u0629 \u0645\u0641\u062A\u0648\u062D\u0629 \u0648\u0627\u0642\u0641\u0644 \u0627\u0644\u0646\u0633\u062E \u0627\u0644\u062A\u0627\u0646\u064A\u0629 \u0645\u0646 \u0627\u0644\u0635\u0641\u062D\u0629 \u062B\u0645 \u062C\u0631\u0651\u0628 \u0627\u0644\u0645\u0633\u062D.");
  r.onerror = () => status("\u062A\u0639\u0630\u0631 \u0645\u0633\u062D \u0627\u0644\u0623\u062C\u0632\u0627\u0621. \u0627\u0633\u062A\u062E\u062F\u0645 \u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0648\u0642\u0639.");
};
function updateSizeChoices() {
  const ai = $("method").value === "ai";
  for (const o of $("scale").options) {
    o.disabled = Boolean(source && !ai && outputSize(o.value).width * outputSize(o.value).height > 2e7);
  }
  if (!ai && $("scale").selectedOptions[0]?.disabled) {
    $("scale").value = "1";
  }
  const size = source ? outputSize(ai ? "2" : $("scale").value) : null;
  $("sizeNote").textContent = source ? "\u0627\u0644\u0645\u0642\u0627\u0633 \u0627\u0644\u0645\u062A\u0648\u0642\u0639: " + size.width + " \xD7 " + size.height + " \u0628\u0643\u0633\u0644. " + (ai ? "\u062A\u0643\u0628\u064A\u0631 \u0645\u062A\u0639\u0644\u0651\u0645 \xD7\u0662 \u0641\u0642\u0637." : $("scale").value === "4k" ? "\u0645\u0642\u0627\u0633 4K: \u0627\u0644\u0636\u0644\u0639 \u0627\u0644\u0623\u0637\u0648\u0644 \u0663\u0668\u0664\u0660 \u0628\u0643\u0633\u0644\u060C \u0628\u0646\u0641\u0633 \u0627\u0644\u0646\u0633\u0628\u0629 \u0648\u0645\u0646 \u063A\u064A\u0631 \u0642\u0635 \u0623\u0648 \u062A\u0645\u062F\u064A\u062F. \u062A\u063A\u064A\u064A\u0631 \u0645\u0642\u0627\u0633 \u0639\u0627\u062F\u064A\u060C \u0645\u0634 \u062A\u0643\u0628\u064A\u0631 \u0645\u062A\u0639\u0644\u0651\u0645." : "\u0627\u0644\u0648\u0636\u0639 \u0627\u0644\u0633\u0631\u064A\u0639 \u064A\u0639\u064A\u062F \u0627\u0644\u062A\u062D\u062C\u064A\u0645\u060C \u0645\u0634 \u062A\u0643\u0628\u064A\u0631 \u0645\u062A\u0639\u0644\u0651\u0645.") + " \u062D\u062F \u0627\u0644\u0646\u062A\u064A\u062C\u0629 \u0662\u0660 \u0645\u064A\u062C\u0627\u0628\u0643\u0633\u0644." : "\u062D\u062F \u0627\u0644\u0646\u062A\u064A\u062C\u0629 \u0662\u0660 \u0645\u064A\u062C\u0627\u0628\u0643\u0633\u0644. \u0627\u0644\u0627\u062E\u062A\u064A\u0627\u0631\u0627\u062A \u0627\u0644\u0645\u062A\u0627\u062D\u0629 \u062A\u062A\u063A\u064A\u0631 \u062D\u0633\u0628 \u0645\u0642\u0627\u0633 \u0627\u0644\u0635\u0648\u0631\u0629.";
}
var previousMethodChange = $("method").onchange;
$("method").onchange = () => {
  previousMethodChange();
  updateSizeChoices();
};
$("scale").onchange = updateSizeChoices;
var previewFit = true;
function refreshPreview() {
  const displayed = $($("previewVersion").value);
  const img = $("previewImage");
  img.src = displayed.src;
  const natural = displayed.naturalWidth;
  if (previewFit) {
    img.style.width = "100%";
    img.style.maxWidth = natural + "px";
    $("previewZoomLabel").textContent = "\u0645\u0644\u0627\u0621\u0645\u0629";
  } else {
    img.style.maxWidth = "none";
    img.style.width = Math.round(natural * Number($("previewZoom").value) / 100) + "px";
    $("previewZoomLabel").textContent = $("previewZoom").value + "%";
  }
}
$("previewOpen").onclick = () => {
  previewFit = true;
  $("previewVersion").value = "after";
  $("previewDialog").showModal();
  refreshPreview();
};
$("previewClose").onclick = () => $("previewDialog").close();
$("previewVersion").onchange = refreshPreview;
$("previewFit").onclick = () => {
  previewFit = true;
  refreshPreview();
};
$("previewActual").onclick = () => {
  previewFit = false;
  $("previewZoom").value = "100";
  refreshPreview();
};
$("previewZoom").oninput = () => {
  previewFit = false;
  refreshPreview();
};
$("previewImage").onload = () => {
};
