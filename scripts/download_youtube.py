import sys
import yt_dlp


def download_youtube_video(url, output_filename="lecture.mp4"):
    ydl_opts = {
        "format": "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
        "outtmpl": output_filename,
        "quiet": False,
    }

    print(f"\nDownloading YouTube video from: {url}")
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([url])
    print(f"\nSuccessfully downloaded video as '{output_filename}'!\n")


if __name__ == "__main__":
    # If URL is passed via argument, use it; otherwise ask user interactively
    if len(sys.argv) > 1:
        target_url = sys.argv[1]
    else:
        target_url = input("Paste your YouTube URL here: ").strip()

    if target_url:
        download_youtube_video(target_url)
    else:
        print("No URL provided. Exiting.")