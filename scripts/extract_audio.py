import argparse
import json
import os
import whisper


def process_audio(file_path, output_json, model_name="base"):
    """Extracts timestamped transcription from a video/audio file using Whisper."""
    print(f"Loading Whisper model '{model_name}'...")
    model = whisper.load_model(model_name)

    print(f"Transcribing: {file_path}")
    result = model.transcribe(file_path, verbose=False)

    transcript_data = []
    for segment in result.get("segments", []):
        transcript_data.append(
            {
                "id": segment["id"],
                "start": round(segment["start"], 2),
                "end": round(segment["end"], 2),
                "text": segment["text"].strip(),
            }
        )

    # Save to JSON
    os.makedirs(os.path.dirname(output_json), exist_ok=True)
    with open(output_json, "w", encoding="utf-8") as f:
        json.dump(transcript_data, f, indent=2)

    print(f"Successfully saved transcript to {output_json}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Transcribe media using Whisper"
    )
    parser.add_argument(
        "--input", required=True, help="Path to input video/audio file or folder"
    )
    parser.add_argument(
        "--output",
        default="src/data/transcript.json",
        help="Path to save output JSON",
    )
    args = parser.parse_args()

    process_audio(args.input, args.output)