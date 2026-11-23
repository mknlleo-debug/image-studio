# Image Studio, large-image local version

Arabic browser-only image enlargement and compression. Serve this directory over HTTPS or localhost. No image upload, accounts, API keys, CDN runtime imports or paid service.

Default fast mode retains ordinary resizing. Optional learned mode uses Real-ESRGAN General x4v3, native 4x inference on padded 128px tiles, row-streamed Lanczos assembly to 2x. Blend defaults to 35%, adjustable 0-100%. Learned detail is estimated, not recovered truth. Input is never silently downsized.

Limits: 20 MB file, 20 MP decoded source, learned input up to 5 MP, output up to 20 MP. Cancel terminates the worker. A 20-minute per-run timeout stops slow runs. Physical phone performance is unverified. Opt-in IndexedDB checkpoints store quantized learned tiles, often more than 300 MB for a full-size image. Re-select identical source and enable checkpoints to resume. Clear removes saved parts.

Validated in desktop Chromium at mobile viewport: actual 1696x2528 source to 3392x5056 learned result, all 280 tiles, checkpoint resume across browser restarts, progress, cancel, clear, output cap, download and readable mobile layout. Settings are locked during work. Very large mobile canvases can still fail safely.

Sources: https://github.com/verekia/upscaler (MIT pipeline); https://huggingface.co/CoderViking/realesr-general-x4v3-onnx (converted weights); https://github.com/xinntao/Real-ESRGAN (BSD-3-Clause); ONNX Runtime Web 1.31.1 (MIT). Complete ONNX 1.31.1 notices obtained from its released Python wheel because raw source retrieval failed. See LICENSES.txt and individual license files.

Model SHA256: 1940a93ee08283a0a7286183186357b1688fe9fa8ede74604b424586aaddf112

Build app.js from src.js and worker.js from worker-source.js with esbuild --bundle --format=esm --minify. Included compiled files work without building. Local modifications add Arabic UI, strength blend, checkpoint storage, cancellation and resource limits. No photos or user data included.

## Source-detail trial
Independent detail control blends source-supported high-frequency residuals, using separable Gaussian sigma 2.2px in a worker with a small row cache. Proposed trial settings: learned strength 100%, source detail 70%, both adjustable. These implement stronger clarity with reduced smoothing, not confirmed final user taste. Existing noise can return; learned facial changes remain. Full-size browser postprocessing tested 3392x5056 in 4.7 seconds on desktop CPU; not a phone benchmark. Small end-to-end learned+detail export and full-source learned progress/cancel regression passed. Detail-stage cancellation explicitly tested at full 3392x5056 after feeding the already completed learned output: cancel returned UI to ready, unlocked settings, kept result hidden, and no late result appeared over the subsequent 7 seconds. Public deployment remains blocked by upload form HTTP 400.
