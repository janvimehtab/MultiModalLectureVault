import argparse
import os
import cv2


def extract_frames(video_path, output_dir, interval_seconds=15):
    """Extracts frames from a video file at given time intervals."""
    if not os.path.exists(video_path):
        raise FileNotFoundError(f"Video file not found: {video_path}")

    os.makedirs(output_dir, exist_ok=True)
    cap = cv2.VideoCapture(video_path)

    fps = cap.get(cv2.CAP_PROP_FPS)
    if fps == 0:
        raise ValueError(
            "Could not determine video FPS. Verify file integrity."
        )

    frame_interval = int(fps * interval_seconds)
    frame_count = 0
    saved_count = 0

    print(
        f"Extracting frames from '{video_path}' every {interval_seconds}s (every {frame_interval} frames)..."
    )

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        if frame_count % frame_interval == 0:
            timestamp_sec = int(frame_count / fps)
            filename = f"frame_{timestamp_sec:04d}.jpg"
            save_path = os.path.join(output_dir, filename)

            cv2.imwrite(save_path, frame)
            saved_count += 1

        frame_count += 1

    cap.release()
    print(f"Successfully saved {saved_count} frames to '{output_dir}'.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Extract timestamped video frames"
    )
    parser.add_argument(
        "--input", required=True, help="Path to input video (e.g. lecture.mp4)"
    )
    parser.add_argument(
        "--output",
        default="public/frames",
        help="Target folder for extracted images",
    )
    parser.add_argument(
        "--interval",
        type=int,
        default=15,
        help="Frame extraction interval in seconds",
    )
    args = parser.parse_args()

    extract_frames(args.input, args.output, args.interval)