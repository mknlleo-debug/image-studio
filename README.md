# Image Studio, large-image local version

Arabic browser-only image enlargement and compression. Serve this directory over HTTPS or localhost. No image upload, accounts, API keys, CDN runtime imports or paid service.

Default fast mode retains ordinary resizing. Optional learned mode uses Real-ESRGAN General x4v3, native 4x inference on padded 128px tiles, row-streamed Lanczos assembly to 2x. Learned strength defaults to 100% and source-detail strength to 70%, both adjustable 0-100%. Learned detail is estimated, not recovered truth. Input is never silently downsized.

Limits: 20 MB file, 20 MP decoded source, learned input up to 5 MP, output up to 20 MP. Cancel terminates the worker. A 20-minute per-run timeout stops slow runs. Physical phone performance is unverified. Opt-in IndexedDB checkpoints store quantized learned tiles, often more than 300 MB for a full-size image. Re-select identical source and enable checkpoints to resume. Clear removes saved parts.

Validated in desktop Chromium at mobile viewport: actual 1696x2528 source to 3392x5056 learned result, all 280 tiles, checkpoint resume across browser restarts, progress, cancel, clear, output cap, download and readable mobile layout. Settings are locked during work. Very large mobile canvases can still fail safely.

Sources: https://github.com/verekia/upscaler (MIT pipeline); https://huggingface.co/CoderViking/realesr-general-x4v3-onnx (converted weights); https://github.com/xinntao/Real-ESRGAN (BSD-3-Clause); ONNX Runtime Web 1.31.1 (MIT). Complete ONNX 1.31.1 notices obtained from its released Python wheel because raw source retrieval failed. See LICENSES.txt and individual license files.

Model SHA256: 1940a93ee08283a0a7286183186357b1688fe9fa8ede74604b424586aaddf112

Build app.js from src.js and worker.js from worker-source.js with esbuild --bundle --format=esm --minify. Included compiled files work without building. Local modifications add Arabic UI, strength blend, checkpoint storage, cancellation and resource limits. No photos or user data included.

## Source-detail blend
Independent detail control blends source-supported high-frequency residuals, using separable Gaussian sigma 2.2px in a worker with a small row cache. Current default settings: learned strength 100%, source detail 70%, both adjustable. These settings combine learned enhancement with source-supported detail to reduce smoothing. Existing noise can return; learned facial changes remain. Full-size browser postprocessing tested 3392x5056 in 4.7 seconds on desktop CPU; not a phone benchmark. Small end-to-end learned+detail export and full-source learned progress/cancel regression passed. Detail-stage cancellation explicitly tested at full 3392x5056 after feeding the already completed learned output: cancel returned UI to ready, unlocked settings, kept result hidden, and no late result appeared over the subsequent 7 seconds. The separate large.html test page is deployed. The original homepage is preserved. The deployed page passed a 384x384 to 768x768 learned+detail WebP test and an original-size JPEG compression test in desktop Chrome at a 390px mobile viewport. These are functional checks, not physical-phone benchmarks.

## Preview and image loading
The large.html candidate includes a separate before-download viewer with original/result selection, fit-to-screen, 100% actual pixels and 25-200% display zoom. Display zoom does not enlarge the exported file. Fast resize factors are 1, 1.5, 2, 3, 4, 6 and 8, with choices above the 20 MP output cap disabled for the current source. Learned enhancement remains 2x.
The image loader snapshots selected bytes, uses createImageBitmap with a FileReader/Image.onload fallback, guards stale selections and retries transient file reads. Desktop regression tests passed; the reported Android issue still requires an on-device retry.


## Local task recovery
The most recent source image, selected settings and finished output are stored in IndexedDB on this device. Learned processing saves completed tiles by source-pixel hash. On reopening, the recovery button restores the image and settings without selecting the file again and reuses completed tiles. Resampling and detail blending may run again. This is not a background execution guarantee. Android/Chrome can freeze or discard hidden pages. Screen Wake Lock is requested only while processing and visible, and released after completion or cancellation.

Storage may exceed300MB for large images. Browser data clearing, private browsing, storage eviction and quota exhaustion can remove or block saved work. The delete button removes the saved task and tile cache. No photo is uploaded to a server.

Regression: a384px learned run was closed after2 of9 tiles. Reopening restored source/settings, reused both tiles, completed768px output, and restored the finished output after another close/reopen. Physical Android background continuation is not verified or promised.
