// ../../downloads/image-studio-recovery/pipeline/models.ts
var RELEASES = "https://github.com/xinntao/Real-ESRGAN/releases/download";
var CHECKPOINTS = {
  "realesrgan-x4plus-anime": {
    url: `${RELEASES}/v0.2.2.4/RealESRGAN_x4plus_anime_6B.pth`,
    sha256: "f872d837d3c90ed2e05227bed711af5671a6fd1c9f7d7e91c911a61f155e99da"
  },
  "realesrgan-x4plus": {
    url: `${RELEASES}/v0.1.0/RealESRGAN_x4plus.pth`,
    sha256: "4fa0d38905f75ac06eb49a7951b426670021be3018265fd191d2125df9d682f1"
  },
  "realesr-animevideov3": {
    url: `${RELEASES}/v0.2.5.0/realesr-animevideov3.pth`,
    sha256: "b8a8376811077954d82ca3fcf476f1ac3da3e8a68a4f4d71363008000a18b75d"
  },
  "realesr-general-x4v3": {
    url: `${RELEASES}/v0.2.5.0/realesr-general-x4v3.pth`,
    sha256: "8dc7edb9ac80ccdc30c3a5dca6616509367f05fbc184ad95b731f05bece96292"
  },
  "realesr-general-wdn-x4v3": {
    url: `${RELEASES}/v0.2.5.0/realesr-general-wdn-x4v3.pth`,
    sha256: "1641f8c4464b9f097c9fdda5589273713f67cf59f3d909e0bd688f0cee269dca"
  }
};
var NATIVE_SCALE = 4;

// ../../downloads/image-studio-recovery/pipeline/resize.ts
var cubic = (b, c) => ({
  support: 2,
  weight: (x) => {
    x = Math.abs(x);
    if (x < 1) return ((12 - 9 * b - 6 * c) * x ** 3 + (-18 + 12 * b + 6 * c) * x ** 2 + (6 - 2 * b)) / 6;
    if (x < 2)
      return ((-b - 6 * c) * x ** 3 + (6 * b + 30 * c) * x ** 2 + (-12 * b - 48 * c) * x + (8 * b + 24 * c)) / 6;
    return 0;
  }
});
var KERNELS = {
  lanczos3: {
    support: 3,
    weight: (x) => {
      if (x === 0) return 1;
      if (Math.abs(x) >= 3) return 0;
      const px = Math.PI * x;
      return 3 * Math.sin(px) * Math.sin(px / 3) / (px * px);
    }
  },
  mitchell: cubic(1 / 3, 1 / 3),
  "catmull-rom": cubic(0, 1 / 2)
};
var contributions = (inSize, outSize, filter) => {
  const { support, weight } = KERNELS[filter];
  const scale = Math.max(1, inSize / outSize);
  const reach = inSize === outSize ? 0.5 : support * scale;
  const taps = Math.ceil(reach) * 2 + 1;
  const first = new Int32Array(outSize);
  const count = new Int32Array(outSize);
  const weights = new Float32Array(outSize * taps);
  for (let o = 0; o < outSize; o++) {
    const center = (o + 0.5) * inSize / outSize;
    const lo = Math.max(0, Math.floor(center - reach + 0.5));
    const hi = Math.min(inSize, Math.ceil(center + reach - 0.5));
    let sum = 0;
    for (let i = lo; i < hi; i++) {
      const w = inSize === outSize ? 1 : weight((i + 0.5 - center) / scale);
      weights[o * taps + i - lo] = w;
      sum += w;
    }
    for (let i = 0; i < hi - lo; i++) weights[o * taps + i] /= sum;
    first[o] = lo;
    count[o] = hi - lo;
  }
  return { first, count, weights, taps };
};
var RowResampler = class {
  // Resamples RGBA channels [offset, offset + channels) of the pushed rows into the same channels of `out`
  constructor(inWidth, inHeight, outWidth, outHeight, filter, out, offset, channels) {
    this.inWidth = inWidth;
    this.outWidth = outWidth;
    this.outHeight = outHeight;
    this.out = out;
    this.offset = offset;
    this.channels = channels;
    this.horizontal = contributions(inWidth, outWidth, filter);
    this.vertical = contributions(inHeight, outHeight, filter);
    const rows = this.vertical.count.reduce((max, count) => Math.max(max, count), 1);
    this.ring = Array.from({ length: rows }, () => new Float32Array(outWidth * channels));
    this.sum = new Float32Array(outWidth * channels);
  }
  inWidth;
  outWidth;
  outHeight;
  out;
  offset;
  channels;
  horizontal;
  vertical;
  ring;
  sum;
  next = 0;
  // Takes input rows [y, y + count), in order, from an RGBA buffer `inWidth` wide
  push(rows, y, count) {
    const { first, count: taps } = this.vertical;
    for (let r = 0; r < count; r++) {
      this.resampleRow(rows, r * this.inWidth * 4, this.ring[(y + r) % this.ring.length]);
      while (this.next < this.outHeight && first[this.next] + taps[this.next] <= y + r + 1) this.emitRow(this.next++);
    }
  }
  resampleRow(rows, offset, target) {
    const { first, count, weights, taps } = this.horizontal;
    const channels = this.channels;
    for (let x = 0; x < this.outWidth; x++) {
      const base = offset + first[x] * 4 + this.offset;
      for (let c = 0; c < channels; c++) {
        let sum = 0;
        for (let i = 0; i < count[x]; i++) sum += rows[base + i * 4 + c] * weights[x * taps + i];
        target[x * channels + c] = sum;
      }
    }
  }
  emitRow(y) {
    const { first, count, weights, taps } = this.vertical;
    const sum = this.sum.fill(0);
    for (let i = 0; i < count[y]; i++) {
      const row = this.ring[(first[y] + i) % this.ring.length];
      const w = weights[y * taps + i];
      for (let j = 0; j < sum.length; j++) sum[j] += row[j] * w;
    }
    const channels = this.channels;
    const offset = y * this.outWidth * 4 + this.offset;
    for (let x = 0; x < this.outWidth; x++)
      for (let c = 0; c < channels; c++) this.out[offset + x * 4 + c] = sum[x * channels + c];
  }
};

// ../../downloads/image-studio-recovery/pipeline/tiles.ts
var tileSize = (size, max) => Math.ceil(size / Math.ceil(size / max));
var spans = (size, tile) => {
  const result = [];
  for (let i = 0; i < Math.ceil(size / tile); i++) {
    const start = Math.min(i * tile, Math.max(0, size - tile));
    result.push({ start, from: i ? result[i - 1].to : 0, to: Math.min(start + tile, size) });
  }
  return result;
};
var reflect = (i, n) => {
  if (n === 1) return 0;
  const period = 2 * (n - 1);
  const j = (i % period + period) % period;
  return j < n ? j : period - j;
};
var readWindow = (pixels, width, height, left, top, out, windowWidth, windowHeight, channels) => {
  const plane = windowWidth * windowHeight;
  const columns = Int32Array.from({ length: windowWidth }, (_, x) => reflect(left + x, width) * 4);
  for (let y = 0; y < windowHeight; y++) {
    const row = reflect(top + y, height) * width * 4;
    for (let x = 0; x < windowWidth; x++) {
      const source = row + columns[x];
      const target = y * windowWidth + x;
      for (let c = 0; c < channels.length; c++) out[c * plane + target] = pixels[source + channels[c]] / 255;
    }
  }
};
var transformPlane = (source, target, n, t) => {
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      let tx = t & 4 ? y : x;
      let ty = t & 4 ? x : y;
      if (t & 1) tx = n - 1 - tx;
      if (t & 2) ty = n - 1 - ty;
      target[ty * n + tx] = source[y * n + x];
    }
  }
};
var addUntransformed = (output, sum, n, t) => {
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      let tx = t & 4 ? y : x;
      let ty = t & 4 ? x : y;
      if (t & 1) tx = n - 1 - tx;
      if (t & 2) ty = n - 1 - ty;
      sum[y * n + x] += output[ty * n + tx];
    }
  }
};

// ../../downloads/image-studio-recovery/pipeline/upscale.ts
var CancelledError = class extends Error {
};
var hasTransparency = (pixels) => {
  for (let i = 3; i < pixels.length; i += 4) if (pixels[i] !== 255) return true;
  return false;
};
var unit = (value) => Math.min(1, Math.max(0, value));
var upscale = async (job, run, hooks = {}) => {
  const { pixels, width, height, outWidth, outHeight, overlap } = job;
  const transparent = hasTransparency(pixels);
  const alphaPass = transparent && job.alpha === "model";
  let tileWidth = tileSize(width, job.tile);
  let tileHeight = tileSize(height, job.tile);
  if (job.tta) tileWidth = tileHeight = Math.max(tileWidth, tileHeight);
  const columns = spans(width, tileWidth);
  const rows = spans(height, tileHeight);
  const total = columns.length * rows.length * (job.tta ? 8 : 1) * (alphaPass ? 2 : 1);
  let done = 0;
  hooks.progress?.(0, total);
  const inWidth = tileWidth + 2 * overlap;
  const inHeight = tileHeight + 2 * overlap;
  const input = new Float32Array(3 * inWidth * inHeight);
  const nativeWidth = width * NATIVE_SCALE;
  const out = new Uint8ClampedArray(outWidth * outHeight * 4);
  const resampler = new RowResampler(
    nativeWidth,
    height * NATIVE_SCALE,
    outWidth,
    outHeight,
    job.filter,
    out,
    0,
    alphaPass ? 4 : 3
  );
  const band = new Uint8ClampedArray(nativeWidth * tileHeight * NATIVE_SCALE * 4).fill(255);
  const infer = async () => {
    if (!job.tta) {
      const output = await run(input, inWidth, inHeight);
      hooks.progress?.(++done, total);
      return output;
    }
    const n = inWidth;
    const m = n * NATIVE_SCALE;
    const variant = new Float32Array(input.length);
    const sum = new Float32Array(3 * m * m);
    for (let t = 0; t < 8; t++) {
      for (let c = 0; c < 3; c++)
        transformPlane(input.subarray(c * n * n, (c + 1) * n * n), variant.subarray(c * n * n, (c + 1) * n * n), n, t);
      const output = await run(variant, n, n);
      for (let c = 0; c < 3; c++)
        addUntransformed(output.subarray(c * m * m, (c + 1) * m * m), sum.subarray(c * m * m, (c + 1) * m * m), m, t);
      hooks.progress?.(++done, total);
    }
    for (let i = 0; i < sum.length; i++) sum[i] /= 8;
    return sum;
  };
  for (const row of rows) {
    const top = row.start - overlap;
    for (const column of columns) {
      if (hooks.cancelled?.()) throw new CancelledError();
      const left = column.start - overlap;
      const outputWidth = inWidth * NATIVE_SCALE;
      const plane = outputWidth * inHeight * NATIVE_SCALE;
      readWindow(pixels, width, height, left, top, input, inWidth, inHeight, [0, 1, 2]);
      let output = await infer();
      for (let y = row.from * NATIVE_SCALE; y < row.to * NATIVE_SCALE; y++) {
        const source = (y - top * NATIVE_SCALE) * outputWidth - left * NATIVE_SCALE;
        const target = (y - row.from * NATIVE_SCALE) * nativeWidth;
        for (let x = column.from * NATIVE_SCALE; x < column.to * NATIVE_SCALE; x++) {
          band[(target + x) * 4] = output[source + x] * 255;
          band[(target + x) * 4 + 1] = output[plane + source + x] * 255;
          band[(target + x) * 4 + 2] = output[2 * plane + source + x] * 255;
        }
      }
      if (alphaPass) {
        readWindow(pixels, width, height, left, top, input, inWidth, inHeight, [3, 3, 3]);
        output = await infer();
        for (let y = row.from * NATIVE_SCALE; y < row.to * NATIVE_SCALE; y++) {
          const source = (y - top * NATIVE_SCALE) * outputWidth - left * NATIVE_SCALE;
          const target = (y - row.from * NATIVE_SCALE) * nativeWidth;
          for (let x = column.from * NATIVE_SCALE; x < column.to * NATIVE_SCALE; x++) {
            const i = source + x;
            band[(target + x) * 4 + 3] = (0.299 * unit(output[i]) + 0.587 * unit(output[plane + i]) + 0.114 * unit(output[2 * plane + i])) * 255;
          }
        }
      }
      if (hooks.tile) {
        const x = column.from * NATIVE_SCALE;
        const w = (column.to - column.from) * NATIVE_SCALE;
        const h = (row.to - row.from) * NATIVE_SCALE;
        const region = new Uint8ClampedArray(w * h * 4);
        for (let y = 0; y < h; y++)
          region.set(band.subarray((y * nativeWidth + x) * 4, (y * nativeWidth + x + w) * 4), y * w * 4);
        hooks.tile(x, row.from * NATIVE_SCALE, w, h, region);
      }
    }
    resampler.push(band, row.from * NATIVE_SCALE, (row.to - row.from) * NATIVE_SCALE);
  }
  if (alphaPass) return out;
  if (transparent) new RowResampler(width, height, outWidth, outHeight, job.filter, out, 3, 1).push(pixels, 0, height);
  else for (let i = 3; i < out.length; i += 4) out[i] = 255;
  return out;
};

// ../../downloads/image-studio-recovery/worker-source.js
var ort;
var session;
var openDB = () => new Promise((res, rej) => {
  const r = indexedDB.open("image-studio-ai-checkpoints", 1);
  r.onupgradeneeded = () => r.result.createObjectStore("tiles");
  r.onsuccess = () => res(r.result);
  r.onerror = () => rej(r.error);
});
var digest = async (a) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", a))].map((x) => x.toString(16).padStart(2, "0")).join("");
var get = (db, k) => new Promise((res, rej) => {
  const r = db.transaction("tiles").objectStore("tiles").get(k);
  r.onsuccess = () => res(r.result);
  r.onerror = () => rej(r.error);
});
var put = (db, k, v) => new Promise((res, rej) => {
  const t = db.transaction("tiles", "readwrite");
  t.objectStore("tiles").put(v, k);
  t.oncomplete = () => res();
  t.onerror = () => rej(t.error);
});
onmessage = async ({ data: m }) => {
  try {
    ort ??= await import("./ort/ort.wasm.min.mjs");
    ort.env.wasm.wasmPaths = new URL("./ort/", self.location).href;
    ort.env.wasm.numThreads = 1;
    postMessage({ type: "progress", text: "\u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u0645\u0648\u062F\u064A\u0644 \u0627\u0644\u0645\u062D\u0644\u064A..." });
    session ??= await ort.InferenceSession.create(new URL("./models/general.onnx", self.location).href, { executionProviders: ["wasm"] });
    const pixels = new Uint8ClampedArray(m.pixels);
    const db = m.resume ? await openDB() : null;
    const key = "general-1940a93e-tile128-pad12:" + m.width + ":" + m.height + ":" + await digest(pixels);
    let tile = 0, reused = 0, saved = 0;
    const output = await upscale({ pixels, width: m.width, height: m.height, outWidth: m.width * 2, outHeight: m.height * 2, filter: "lanczos3", tta: false, alpha: "resize", tile: 128, overlap: 12 }, async (data, w, h) => {
      const k = key + ":" + tile++;
      const cached = db ? await get(db, k) : null;
      if (cached && cached.byteLength === 3 * w * h * 16) {
        reused++;
        return Float32Array.from(new Uint8Array(cached), (x) => x / 255);
      }
      const t = new ort.Tensor("float32", data, [1, 3, h, w]);
      const o = await session.run({ [session.inputNames[0]]: t });
      const v = o[session.outputNames[0]];
      const result = new Float32Array(v.data);
      v.dispose();
      t.dispose();
      if (db) {
        const packed = Uint8ClampedArray.from(result, (x) => x * 255);
        try {
          await put(db, k, packed.buffer);
          saved++;
        } catch (e) {
          throw Error("\u0627\u0644\u0645\u0633\u0627\u062D\u0629 \u0627\u0644\u0645\u062D\u0644\u064A\u0629 \u0645\u0634 \u0643\u0641\u0627\u064A\u0629 \u0644\u062D\u0641\u0638 \u0627\u0644\u0623\u062C\u0632\u0627\u0621. \u062D\u0631\u0651\u0631 \u0645\u0633\u0627\u062D\u0629 \u062B\u0645 \u0627\u0633\u062A\u0643\u0645\u0644. \u0627\u0644\u0623\u062C\u0632\u0627\u0621 \u0627\u0644\u0633\u0627\u0628\u0642\u0629 \u0644\u0633\u0647 \u0645\u062D\u0641\u0648\u0638\u0629.");
        }
      }
      return result;
    }, { progress: (done, total) => postMessage({ type: "progress", text: "\u0627\u0644\u0645\u0639\u0627\u0644\u062C\u0629 \u0627\u0644\u0630\u0643\u064A\u0629 \u0639\u0644\u0649 \u0627\u0644\u062C\u0647\u0627\u0632: " + done + " / " + total + " \u062C\u0632\u0621 | \u0645\u0633\u062A\u0631\u062C\u0639 " + reused + " | \u0645\u062D\u0641\u0648\u0638 \u062C\u062F\u064A\u062F " + saved + " | WASM CPU" }) });
    postMessage({ type: "done", pixels: output.buffer }, [output.buffer]);
    db?.close();
  } catch (e) {
    postMessage({ type: "error", text: e.message || String(e) });
  }
};
