import typer
import cv2
import supervision as sv
from ultralytics import YOLO
from pathlib import Path

app = typer.Typer()
BASE_DIR = Path(__file__).resolve().parent
model = YOLO(str(BASE_DIR / "best.pt"))


def process_video(output_file: str = "output.mp4"):
    input_file = BASE_DIR / "demo.mp4"

    cap = cv2.VideoCapture(str(input_file))

    if not cap.isOpened():
        typer.echo(f"Error: Could not open video: {input_file}")
        raise typer.Exit(code=1)

    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)

    if fps <= 0:
        fps = 25.0

    output_path = Path(output_file)
    if not output_path.is_absolute():
        output_path = BASE_DIR / output_path

    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out = cv2.VideoWriter(str(output_path), fourcc, fps, (width, height))

    if not out.isOpened():
        cap.release()
        typer.echo(f"Error: Could not create output video: {output_path}")
        raise typer.Exit(code=1)

    box_annotator = sv.BoxAnnotator()
    label_annotator = sv.LabelAnnotator()

    try:
        while True:
            ret, frame = cap.read()

            if not ret:
                break

            results = model(frame, verbose=False)[0]
            detections = sv.Detections.from_ultralytics(results)

            annotated = box_annotator.annotate(
                scene=frame.copy(),
                detections=detections
            )
            annotated = label_annotator.annotate(
                scene=annotated,
                detections=detections
            )

            out.write(annotated)

            cv2.imshow("AI Exam Monitoring - Press Q to quit", annotated)

            if cv2.waitKey(1) & 0xFF == ord("q"):
                break
    finally:
        cap.release()
        out.release()
        cv2.destroyAllWindows()

    typer.echo(f"Processed video saved to: {output_path}")


@app.command()
def webcam(output_file: str = "output.mp4"):
    """Process the prerecorded demo video."""
    process_video(output_file)


if __name__ == "__main__":
    app()