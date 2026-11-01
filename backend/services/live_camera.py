"""
AI ExamGuard — Live Camera Service

Background worker that polls an ESP32-CAM /capture endpoint,
runs YOLO inference on each frame, and stores results in memory
for the API to serve.

Uses polling (not MJPEG stream) because ESP32-CAM OV5640 firmware
does not reliably serve :81/stream to non-browser clients.
"""
import logging
import threading
import time
from datetime import datetime, timezone
from io import BytesIO
from typing import Optional, Dict, Any
from urllib.request import urlopen, Request
from urllib.error import URLError

import cv2
import numpy as np
import supervision as sv

from backend.services.inference import run_inference, get_class_names, is_model_loaded

logger = logging.getLogger(__name__)

def _play_system_beep():
    """Trigger a physical audible warning beep on the host system."""
    try:
        import winsound
        # 1200 Hz tone for 350 ms
        winsound.Beep(1200, 350)
    except Exception:
        # Fallback terminal bell on non-Windows platforms
        print("\a", end="", flush=True)


def normalize_camera_ip(ip: str) -> str:
    """Normalize input such as 'http://10.134.243.228/' to '10.134.243.228'."""
    ip = ip.strip()
    if ip.startswith("http://"):
        ip = ip[7:]
    elif ip.startswith("https://"):
        ip = ip[8:]
    return ip.split("/")[0].strip()

# ─── Thread-safe state ────────────────────────────────────
_lock = threading.Lock()
_state: Dict[str, Any] = {
    "running": False,
    "camera_ip": "10.134.243.228",
    "connected": False,
    "last_frame_time": None,
    "last_inference_time": None,
    "latest_detections": [],
    "latest_frame_jpeg": None,       # annotated JPEG bytes
    "latest_raw_frame_jpeg": None,   # raw JPEG from camera
    "frames_processed": 0,
    "total_cheating": 0,
    "total_non_cheating": 0,
    "error": None,
    "fps": 0.0,
}

_worker_thread: Optional[threading.Thread] = None
_stop_event = threading.Event()


def get_live_status() -> dict:
    """Return a snapshot of the current live monitoring state."""
    with _lock:
        return {
            "running": _state["running"],
            "camera_ip": _state["camera_ip"],
            "connected": _state["connected"],
            "last_frame_time": _state["last_frame_time"],
            "last_inference_time": _state["last_inference_time"],
            "latest_detections": _state["latest_detections"],
            "frames_processed": _state["frames_processed"],
            "total_cheating": _state["total_cheating"],
            "total_non_cheating": _state["total_non_cheating"],
            "error": _state["error"],
            "fps": _state["fps"],
        }


def get_latest_frame() -> Optional[bytes]:
    """Return the latest annotated JPEG frame bytes, or None."""
    with _lock:
        return _state["latest_frame_jpeg"]


def start_live_monitoring(camera_ip: str = "10.134.243.228", capture_interval: float = 2.0) -> dict:
    """Start the background polling worker."""
    global _worker_thread

    clean_ip = normalize_camera_ip(camera_ip)
    if not clean_ip:
        return {"ok": False, "error": "Camera IP address cannot be empty"}

    with _lock:
        if _state["running"]:
            if _state["camera_ip"] == clean_ip and _state["connected"]:
                return {"ok": True, "message": "Already running"}
            # If changing IP or was in error, stop previous
            _stop_event.set()

    if _worker_thread is not None and _worker_thread.is_alive():
        _worker_thread.join(timeout=3)

    if not is_model_loaded():
        logger.warning("YOLO model not loaded when starting live camera, will attempt inference anyway if available")

    # Quick connectivity test
    capture_url = f"http://{clean_ip}/capture"
    try:
        req = Request(capture_url, headers={"User-Agent": "ExamGuard/1.0"})
        resp = urlopen(req, timeout=5)
        if resp.status != 200:
            return {"ok": False, "error": f"Camera returned HTTP {resp.status}"}
        resp.read()  # consume
    except Exception as e:
        logger.warning(f"Initial camera ping to {capture_url} failed: {e}. Starting worker with reconnection loop.")

    _stop_event.clear()

    with _lock:
        _state.update({
            "running": True,
            "camera_ip": clean_ip,
            "connected": False,
            "error": None,
            "frames_processed": 0,
            "total_cheating": 0,
            "total_non_cheating": 0,
            "latest_detections": [],
            "latest_frame_jpeg": None,
            "latest_raw_frame_jpeg": None,
            "last_frame_time": None,
            "last_inference_time": None,
            "fps": 0.0,
        })

    _worker_thread = threading.Thread(
        target=_polling_worker,
        args=(clean_ip, capture_interval),
        daemon=True,
    )
    _worker_thread.start()

    logger.info(f"Live monitoring started for camera at {clean_ip}")
    return {"ok": True}


def stop_live_monitoring() -> dict:
    """Stop the background polling worker."""
    with _lock:
        if not _state["running"]:
            return {"ok": True, "message": "Not running"}

    _stop_event.set()

    if _worker_thread is not None and _worker_thread.is_alive():
        _worker_thread.join(timeout=5)

    with _lock:
        _state["running"] = False
        _state["connected"] = False

    logger.info("Live monitoring stopped")
    return {"ok": True}


def _polling_worker(camera_ip: str, capture_interval: float):
    """Background thread: poll /capture, run inference, store results."""
    capture_url = f"http://{camera_ip}/capture"
    box_annotator = sv.BoxAnnotator()
    label_annotator = sv.LabelAnnotator()

    consecutive_errors = 0
    max_consecutive_errors = 15

    logger.info(f"Polling worker started: {capture_url} every {capture_interval}s")

    while not _stop_event.is_set():
        loop_start = time.time()

        try:
            # Capture frame
            req = Request(capture_url, headers={"User-Agent": "ExamGuard/1.0"})
            resp = urlopen(req, timeout=6)
            jpeg_bytes = resp.read()

            if len(jpeg_bytes) < 100:
                raise ValueError(f"Frame too small ({len(jpeg_bytes)} bytes)")

            # Decode
            arr = np.frombuffer(jpeg_bytes, dtype=np.uint8)
            frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
            if frame is None:
                raise ValueError("Failed to decode JPEG frame")

            now = datetime.now(timezone.utc).isoformat()
            class_names = get_class_names()

            # Run YOLO inference
            inference_start = time.time()
            det_list = []
            cheating_this_frame = 0
            non_cheating_this_frame = 0
            annotated = frame.copy()

            if is_model_loaded():
                result = run_inference(frame, confidence_threshold=0.25)
                detections = sv.Detections.from_ultralytics(result)

                if len(detections) > 0:
                    for i in range(len(detections)):
                        cid = int(detections.class_id[i]) if detections.class_id is not None else -1
                        conf = float(detections.confidence[i]) if detections.confidence is not None else 0.0
                        cname = class_names.get(cid, f"class_{cid}")
                        det_list.append({
                            "class_id": cid,
                            "class_name": cname,
                            "confidence": round(conf, 4),
                        })
                        if cname == "cheating":
                            cheating_this_frame += 1
                        else:
                            non_cheating_this_frame += 1

                # Annotate frame
                labels = []
                if detections.class_id is not None and detections.confidence is not None:
                    for i in range(len(detections)):
                        cid = int(detections.class_id[i])
                        conf = float(detections.confidence[i])
                        cname = class_names.get(cid, f"class_{cid}")
                        labels.append(f"{cname} {conf:.2f}")

                annotated = box_annotator.annotate(scene=annotated, detections=detections)
                annotated = label_annotator.annotate(
                    scene=annotated, detections=detections, labels=labels if labels else None
                )

                if cheating_this_frame > 0:
                    # Cheating detected: play physical system beep asynchronously
                    threading.Thread(target=_play_system_beep, daemon=True).start()

            inference_ms = round((time.time() - inference_start) * 1000, 1)

            # Overlay timestamp on frame bottom-left
            timestamp_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            cv2.putText(
                annotated,
                f"ESP32-CAM ({camera_ip}) | {timestamp_str}",
                (10, annotated.shape[0] - 12),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.45,
                (0, 255, 255),
                1,
                cv2.LINE_AA,
            )

            # Encode annotated frame to JPEG
            _, annotated_jpeg = cv2.imencode(".jpg", annotated, [cv2.IMWRITE_JPEG_QUALITY, 85])

            elapsed = time.time() - loop_start
            fps = round(1.0 / elapsed, 2) if elapsed > 0 else 0.0

            # Update state
            with _lock:
                _state["connected"] = True
                _state["last_frame_time"] = now
                _state["last_inference_time"] = f"{inference_ms}ms"
                _state["latest_detections"] = det_list
                _state["latest_frame_jpeg"] = annotated_jpeg.tobytes()
                _state["latest_raw_frame_jpeg"] = jpeg_bytes
                _state["frames_processed"] += 1
                _state["total_cheating"] += cheating_this_frame
                _state["total_non_cheating"] += non_cheating_this_frame
                _state["error"] = None
                _state["fps"] = fps

            consecutive_errors = 0

        except Exception as e:
            consecutive_errors += 1
            logger.warning(f"Live capture error ({consecutive_errors}/{max_consecutive_errors}): {e}")

            with _lock:
                _state["connected"] = False
                _state["error"] = str(e)

            if consecutive_errors >= max_consecutive_errors:
                logger.error("Too many consecutive errors, pausing live monitoring")
                with _lock:
                    _state["running"] = False
                    _state["error"] = f"Camera offline at {capture_url}: {e}"
                break

        # Wait before next capture
        elapsed = time.time() - loop_start
        sleep_time = max(0, capture_interval - elapsed)
        if sleep_time > 0:
            _stop_event.wait(sleep_time)

    with _lock:
        _state["running"] = False

    logger.info("Polling worker exited")
