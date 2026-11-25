# Video Call Interface

Frontend application for a browser-based video calling service.

## Overview

Provides the web interface for joining and managing video call sessions.

## Status

In development.

## On-device live face swap

The call overlay keeps its current upload, apply, update-photo, and return-to-camera controls. The face-swap processor runs in the caller's browser and replaces only the outgoing WebRTC video track. Camera frames and the selected portrait are not sent to the Python ML service; the transformed camera video is still sent to the other call participant as part of the call.

The upstream `browser-inswapper` source is pinned in `vendor/browser-inswapper` at commit `25ea3b1d7d93e2fe1629bd1580d3c22496f840ac`; keep its `LICENSE.md` and `NOTICE.md` with the source. Its model weights have separate terms. The runtime does not include those weights in Git.

### Provide the licensed model files

Place these authorized files in an HTTPS object-storage folder or model CDN. The storage host must allow CORS requests from the deployed MIYOR web origin and support range-free downloads. Browser-side processing means a user device downloads these weights; this path does not keep the weights secret from users who can run the feature.

```text
inswapper_128.onnx
w600k_r50.onnx
```

Optionally add `inswapper_128_fp16.onnx` for capable GPUs. The worker bundle uses a pinned ONNX Runtime Web version and MediaPipe; the Face Landmarker and occlusion model use their upstream MediaPipe-hosted assets.

Configure the web app in local `.env.local` and in Vercel's environment settings:

```text
NEXT_PUBLIC_MIYOR_FACE_SWAP_MODEL_BASE_URL=https://models.example.com/miyor
NEXT_PUBLIC_MIYOR_FACE_SWAP_SWAPPER_SHA256=<64-character SHA-256 of inswapper_128.onnx>
NEXT_PUBLIC_MIYOR_FACE_SWAP_ARCFACE_SHA256=<64-character SHA-256 of w600k_r50.onnx>
NEXT_PUBLIC_MIYOR_FACE_SWAP_SWAPPER_FP16_SHA256=<optional 64-character SHA-256 of inswapper_128_fp16.onnx>
```

The runtime verifies each supplied model fingerprint before use and caches verified files in browser storage for later calls. Do not put private signing keys in `NEXT_PUBLIC_*` values. `NEXT_PUBLIC_MIYOR_FACE_SWAP_MODEL_BASE_URL` must be a URL from which authorized users can download the licensed weights; plan its access controls and license terms accordingly.

Run `npm run dev` or `npm run build`; the pre-scripts build the pinned face-swap package and copy its self-contained workers under `public/vendor/browser-inswapper`. The first apply downloads the required model assets, so the call UI shows loading progress. Performance depends heavily on each phone/browser/GPU; the call shows measured swap FPS and keeps the original camera path available through **Return to camera**.
