import argparse
import json
import os
from pypdf import PdfReader


def extract_pdf_slides(pdf_path, output_json):
    """Parses text from each page of a PDF slide deck."""
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"PDF file not found: {pdf_path}")

    reader = PdfReader(pdf_path)
    slides_data = []

    print(
        f"Extracting slide content from '{pdf_path}' ({len(reader.pages)} pages)..."
    )

    for index, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        slides_data.append(
            {
                "slideNumber": index + 1,
                "text": text.strip(),
            }
        )

    os.makedirs(os.path.dirname(output_json), exist_ok=True)
    with open(output_json, "w", encoding="utf-8") as f:
        json.dump(slides_data, f, indent=2)

    print(f"Successfully extracted {len(slides_data)} slides to '{output_json}'.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Extract structured text from PDF presentation slides"
    )
    parser.add_argument(
        "--input", required=True, help="Path to presentation PDF file"
    )
    parser.add_argument(
        "--output",
        default="src/data/slides.json",
        help="Output path for JSON slide data",
    )
    args = parser.parse_args()

    extract_pdf_slides(args.input, args.output)