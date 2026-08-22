import json
import os
import cv2
import whisper


def build_database(
    video_path="lecture.mp4",
    audio_path="audio_notes.ogg",  # Updated to .ogg format
    notes_path="lecture_notes.txt",
    output_json="src/data/sample_data.json",
    frames_dir="public/frames",
):
    dataset = []
    item_id = 1

    # Load Whisper model locally
    print("Loading Whisper Model...")
    model = whisper.load_model("base")

    # 1. PROCESS VIDEO (Audio Transcript + Keyframe Extraction)
    if os.path.exists(video_path):
        print(f"Processing Video: {video_path}")

        # Extract Transcript
        video_res = model.transcribe(video_path)
        for seg in video_res.get("segments", []):
            mins, secs = int(seg["start"] // 60), int(seg["start"] % 60)
            dataset.append(
                {
                    "id": f"item_{item_id:02d}",
                    "source_file": video_path,
                    "modality": "video_transcript",
                    "timestamp": f"{mins:02d}:{secs:02d}",
                    "speaker": "Lecturer",
                    "content": seg["text"].strip(),
                    "media_url": None,
                }
            )
            item_id += 1

        # Extract Keyframe Images
        os.makedirs(frames_dir, exist_ok=True)
        cap = cv2.VideoCapture(video_path)
        fps = int(cap.get(cv2.CAP_PROP_FPS)) or 30
        interval_sec = 15  # Capture 1 frame every 15s
        frame_idx = 0

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            if frame_idx % (fps * interval_sec) == 0:
                current_sec = int(frame_idx / fps)
                mins, secs = current_sec // 60, current_sec % 60
                frame_filename = f"frame_{mins:02d}{secs:02d}.jpg"
                save_path = os.path.join(frames_dir, frame_filename)
                cv2.imwrite(save_path, frame)

                dataset.append(
                    {
                        "id": f"item_{item_id:02d}",
                        "source_file": video_path,
                        "modality": "video_frame_ocr",
                        "timestamp": f"{mins:02d}:{secs:02d}",
                        "speaker": "Visual Slide",
                        "content": f"Visual frame captured at {mins:02d}:{secs:02d} showing lecture material.",
                        "media_url": f"/frames/{frame_filename}",
                    }
                )
                item_id += 1
            frame_idx += 1
        cap.release()

    # 2. PROCESS STANDALONE .OGG AUDIO FILE
    if os.path.exists(audio_path):
        print(f"Processing OGG Audio: {audio_path}")
        audio_res = model.transcribe(audio_path)
        for seg in audio_res.get("segments", []):
            mins, secs = int(seg["start"] // 60), int(seg["start"] % 60)
            dataset.append(
                {
                    "id": f"item_{item_id:02d}",
                    "source_file": audio_path,
                    "modality": "audio_notes",
                    "timestamp": f"{mins:02d}:{secs:02d}",
                    "speaker": "Student Voice Note",
                    "content": seg["text"].strip(),
                    "media_url": None,
                }
            )
            item_id += 1

    # 3. PROCESS TEXT NOTES FILE
    if os.path.exists(notes_path):
        print(f"Processing Notes: {notes_path}")
        with open(notes_path, "r", encoding="utf-8") as f:
            lines = [line.strip() for line in f.readlines() if line.strip()]

        for idx, line in enumerate(lines):
            dataset.append(
                {
                    "id": f"item_{item_id:02d}",
                    "source_file": notes_path,
                    "modality": "text_notes",
                    "timestamp": f"Section {idx + 1}",
                    "speaker": "Student Notes",
                    "content": line,
                    "media_url": None,
                }
            )
            item_id += 1

    # Save to JSON
    os.makedirs(os.path.dirname(output_json), exist_ok=True)
    with open(output_json, "w", encoding="utf-8") as f:
        json.dump(dataset, f, indent=2)

    print(
        f"\nSUCCESS! Built database with {len(dataset)} items in {output_json}"
    )


if __name__ == "__main__":
    build_database()