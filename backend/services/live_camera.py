"""
AI ExamGuard — Live Camera Service

Background worker that polls an ESP32-CAM /capture endpoint,
runs YOLO inference on each frame, records cheating detection events
into the database, triggers audio alerts, and serves annotated frames.

Optimized for ESP32 stability:
- Configures VGA framesize (640x480) to prevent brownout reboots.
- Paces polling to ~3.0s to keep voltage regulator and Wi-Fi cool.
- Non-blocking instant stop handler.
- Always serves a valid standby JPEG so browser never shows broken image icon.
"""
import logging
import threading
import time
import uuid
from datetime import datetime, timezone
from io import BytesIO
from typing import Optional, Dict, Any
from urllib.request import urlopen, Request
from urllib.error import URLError

import cv2
import numpy as np
import supervision as sv

from backend.database import SessionLocal
from backend.models import VideoJob, DetectionEvent
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


def _create_standby_frame(message: str = "Awaiting ESP32-CAM Feed Handshake...") -> bytes:
    """Generate a clean standby JPEG frame so browser never displays a broken image."""
    img = np.zeros((480, 640, 3), dtype=np.uint8)
    # Dark slate background #020617 (BGR: 23, 6, 2)
    img[:] = (23, 6, 2)
    # Border
    cv2.rectangle(img, (12, 12), (628, 468), (55, 35, 20), 2)
    # Header
    cv2.putText(img, "AI ExamGuard Surveillance", (160, 200), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (255, 255, 255), 2, cv2.LINE_AA)
    # Status Message
    cv2.putText(img, message, (150, 245), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 190, 255), 1, cv2.LINE_AA)
    # Hint
    cv2.putText(img, "Hardware: ESP32-CAM OV5640 | YOLOv8 Active", (150, 280), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (140, 140, 140), 1, cv2.LINE_AA)
    # Timestamp
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cv2.putText(img, ts, (240, 315), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (100, 100, 100), 1, cv2.LINE_AA)
    _, encoded = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 85])
    return encoded.tobytes()


# ─── Thread-safe state ────────────────────────────────────
_lock = threading.Lock()
_state: Dict[str, Any] = {
    "running": False,
    "camera_ip": "10.134.243.228",
    "connected": False,
    "last_frame_time": None,
    "last_inference_time": None,
    "latest_detections": [],
    "latest_frame_jpeg": _create_standby_frame(),
    "latest_raw_frame_jpeg": None,
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


def get_latest_frame() -> bytes:
    """Return the latest annotated JPEG frame bytes (guaranteed non-null)."""
    with _lock:
        if _state["latest_frame_jpeg"] is not None:
            return _state["latest_frame_jpeg"]
        return _create_standby_frame()


def start_live_monitoring(camera_ip: str = "10.134.243.228", capture_interval: float = 3.0) -> dict:
    """Start the background polling worker with brownout protection."""
    global _worker_thread

    clean_ip = normalize_camera_ip(camera_ip)
    if not clean_ip:
        return {"ok": False, "error": "Camera IP address cannot be empty"}

    # Signal stop on any previous instance
    _stop_event.set()

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
            "latest_frame_jpeg": _create_standby_frame(f"Connecting to ESP32-CAM at {clean_ip}..."),
            "latest_raw_frame_jpeg": None,
            "last_frame_time": None,
            "last_inference_time": None,
            "fps": 0.0,
        })

    # Clear stop event for the new worker
    _stop_event.clear()

    # Pre-configure camera resolution to VGA (framesize=10) to reduce power draw & prevent rebooting
    def _optimize_camera():
        try:
            req = Request(f"http://{clean_ip}/control?var=framesize&val=10", headers={"User-Agent": "ExamGuard/1.0"})
            urlopen(req, timeout=3)
            logger.info(f"ESP32-CAM {clean_ip} framesize set to VGA (640x480)")
        except Exception as e:
            logger.debug(f"Framesize optimize notice: {e}")

    threading.Thread(target=_optimize_camera, daemon=True).start()

    _worker_thread = threading.Thread(
        target=_polling_worker,
        args=(clean_ip, max(2.5, capture_interval)),
        daemon=True,
    )
    _worker_thread.start()

    logger.info(f"Live monitoring worker started for camera at {clean_ip}")
    return {"ok": True}


def stop_live_monitoring() -> dict:
    """Stop the background polling worker instantly without blocking."""
    _stop_event.set()

    with _lock:
        _state["running"] = False
        _state["connected"] = False
        _state["latest_frame_jpeg"] = _create_standby_frame("Live Stream Paused")

    logger.info("Live monitoring stop requested successfully")
    return {"ok": True}


def _polling_worker(camera_ip: str, capture_interval: float):
    """Background thread: poll /capture, run inference, store results, log events."""
    capture_url = f"http://{camera_ip}/capture"
    box_annotator = sv.BoxAnnotator()
    label_annotator = sv.LabelAnnotator()

    db = SessionLocal()
    live_job_id = "live-esp32-stream"

    # Ensure live VideoJob exists so DetectionEvents can link to it
    try:
        live_job = db.query(VideoJob).filter(VideoJob.id == live_job_id).first()
        if not live_job:
            live_job = VideoJob(
                id=live_job_id,
                input_filename=f"ESP32-CAM Live ({camera_ip})",
                input_path=f"http://{camera_ip}/capture",
                status="processing",
                started_at=datetime.now(timezone.utc),
            )
            db.add(live_job)
            db.commit()
    except Exception as e:
        logger.warning(f"Could not initialize live VideoJob in DB: {e}")
        db.rollback()

    consecutive_errors = 0
    max_consecutive_errors = 20
    worker_start_time = time.time()

    logger.info(f"Polling worker started: {capture_url} every {capture_interval}s")

    try:
        while not _stop_event.is_set():
            loop_start = time.time()

            try:
                # Capture frame from ESP32-CAM with 4-second socket timeout
                req = Request(capture_url, headers={"User-Agent": "ExamGuard/1.0"})
                resp = urlopen(req, timeout=4)
                jpeg_bytes = resp.read()

                if len(jpeg_bytes) < 100:
                    raise ValueError(f"Frame too small ({len(jpeg_bytes)} bytes)")

                # Decode JPEG
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
                            bbox = detections.xyxy[i] if detections.xyxy is not None and len(detections.xyxy) > i else None

                            det_list.append({
                                "class_id": cid,
                                "class_name": cname,
                                "confidence": round(conf, 4),
                            })

                            if cname == "cheating":
                                cheating_this_frame += 1
                                # Persist DetectionEvent into database for audit log
                                try:
                                    event = DetectionEvent(
                                        id=str(uuid.uuid4()),
                                        job_id=live_job_id,
                                        frame_number=_state["frames_processed"] + 1,
                                        timestamp_sec=round(time.time() - worker_start_time, 2),
                                        class_id=cid,
                                        class_name=cname,
                                        confidence=round(conf, 4),
                                        bbox_x1=float(bbox[0]) if bbox is not None else None,
                                        bbox_y1=float(bbox[1]) if bbox is not None else None,
                                        bbox_x2=float(bbox[2]) if bbox is not None else None,
                                        bbox_y2=float(bbox[3]) if bbox is not None else None,
                                        source_video=f"ESP32-CAM Live ({camera_ip})",
                                        review_status="pending",
                                    )
                                    db.add(event)
                                    db.commit()
                                    logger.info(f"Live cheat event recorded: conf={conf:.2f}")
                                except Exception as db_err:
                                    db.rollback()
                                    logger.warning(f"Failed to record live detection event: {db_err}")
                            else:
                                non_cheating_this_frame += 1

                    # Annotate frame with bounding boxes and labels
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

                # Overlay timestamp and IP banner on frame bottom
                timestamp_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                overlay_text = f"ESP32-CAM ({camera_ip}) | {timestamp_str} | AI: {inference_ms}ms"
                cv2.putText(
                    annotated,
                    overlay_text,
                    (10, annotated.shape[0] - 12),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.45,
                    (0, 255, 255) if cheating_this_frame == 0 else (0, 0, 255),
                    1,
                    cv2.LINE_AA,
                )

                # Encode annotated frame to JPEG
                _, annotated_jpeg = cv2.imencode(".jpg", annotated, [cv2.IMWRITE_JPEG_QUALITY, 85])

                elapsed = time.time() - loop_start
                fps = round(1.0 / elapsed, 2) if elapsed > 0 else 0.0

                # Update live job summary counters periodically
                if cheating_this_frame > 0 or _state["frames_processed"] % 20 == 0:
                    try:
                        j = db.query(VideoJob).filter(VideoJob.id == live_job_id).first()
                        if j:
                            j.processed_frames = _state["frames_processed"] + 1
                            j.cheating_count = _state["total_cheating"] + cheating_this_frame
                            j.non_cheating_count = _state["total_non_cheating"] + non_cheating_this_frame
                            j.total_detections = j.cheating_count + j.non_cheating_count
                            db.commit()
                    except Exception:
                        db.rollback()

                # Update thread-safe memory state
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

                standby = _create_standby_frame(f"Camera Reconnecting ({consecutive_errors}/{max_consecutive_errors})...")
                with _lock:
                    _state["connected"] = False
                    _state["error"] = str(e)
                    _state["latest_frame_jpeg"] = standby

                if consecutive_errors >= max_consecutive_errors:
                    logger.error("Too many consecutive errors, pausing live monitoring")
                    with _lock:
                        _state["running"] = False
                        _state["error"] = f"Camera offline at {capture_url}: {e}"
                        _state["latest_frame_jpeg"] = _create_standby_frame("Camera Offline — Check Power & Wi-Fi")
                    break

                # Back off on error to let the camera power rail recover
                _stop_event.wait(3.0)

            # Sleep between captures (ensures ~3 seconds total loop time)
            elapsed = time.time() - loop_start
            sleep_time = max(0.5, capture_interval - elapsed)
            _stop_event.wait(sleep_time)

    finally:
        with _lock:
            _state["running"] = False
        db.close()
        logger.info("Polling worker exited cleanly")
