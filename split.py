import subprocess
import re
import logging
import os
import sys
import traceback

# Set up logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')

def parse_time(time_str):
    hours, minutes, seconds = time_str.split(':')
    return float(hours) * 3600 + float(minutes) * 60 + float(seconds.replace(',', '.').replace('.', '.'))

def split_video(input_video, srt_file):
    logging.info(f"Starting video splitting process")
    logging.info(f"Input video: {input_video}")
    logging.info(f"SRT file: {srt_file}")

    if not os.path.exists(input_video):
        logging.error(f"Input video file not found: {input_video}")
        return
    if not os.path.exists(srt_file):
        logging.error(f"SRT file not found: {srt_file}")
        return

    with open(srt_file, 'r', encoding='utf-8') as f:
        content = f.read()

    logging.info("Parsing SRT content")
    logging.debug(f"SRT content (first 500 characters): {content[:500]}")

    # Updated regex pattern
    pattern = r'(\d+)\n(\d{2}:\d{2}:\d{2}[,\.]\d{3}) --> (\d{2}:\d{2}:\d{2}[,\.]\d{3})\n((?:.*(?:\n(?!\d+\n\d{2}:\d{2}:\d{2}))*))'
    matches = re.findall(pattern, content)
    logging.info(f"Found {len(matches)} subtitle entries")

    if len(matches) == 0:
        logging.warning("No matches found. Checking individual pattern components:")
        patterns = [
            r'\d+',
            r'\d{2}:\d{2}:\d{2}[,\.]\d{3}',
            r'\d{2}:\d{2}:\d{2}[,\.]\d{3} --> \d{2}:\d{2}:\d{2}[,\.]\d{3}',
            r'(?:.*(?:\n(?!\d+\n\d{2}:\d{2}:\d{2}))*)'
        ]
        for i, p in enumerate(patterns):
            if re.search(p, content):
                logging.info(f"Pattern component {i+1} matched")
            else:
                logging.warning(f"Pattern component {i+1} did not match")
    else:
        for i, (index, start, end, text) in enumerate(matches):  # Log all matches
            logging.debug(f"Match {i+1}:")
            logging.debug(f"  Index: {index}")
            logging.debug(f"  Start: {start}")
            logging.debug(f"  End: {end}")
            logging.debug(f"  Text: {text.strip()}")

    try:
        for i, (index, start, end, text) in enumerate(matches):
            try:
                start_time = parse_time(start)
                end_time = parse_time(end)
                
                # Clean up the text
                text = text.strip().replace('\n', ' ')
                
                output_file = f"clip_{i+1:03d}_{text[:30]}.mp4"
                
                logging.info(f"Processing clip {i+1}")
                logging.info(f"  Start time: {start}")
                logging.info(f"  End time: {end}")
                logging.info(f"  Text: {text}")
                logging.info(f"  Output file: {output_file}")

                command = [
                    'ffmpeg',
                    '-i', input_video,
                    '-ss', f"{start_time:.3f}",
                    '-to', f"{end_time:.3f}",
                    '-c:v', 'libx264',  # Re-encode video
                    '-c:a', 'aac',      # Re-encode audio
                    '-strict', 'experimental',
                    output_file
                ]
                
                logging.info(f"Executing FFmpeg command: {' '.join(command)}")
                
                result = subprocess.run(command, check=True, capture_output=True, text=True)
                logging.info(f"Clip {i+1} created successfully")
                
                logging.info(f"Finished processing clip {i+1}")
            except subprocess.CalledProcessError as e:
                logging.error(f"Error creating clip {i+1}")
                logging.error(f"FFmpeg command failed with return code {e.returncode}")
                logging.error(f"Error output: {e.stderr}")
            except Exception as e:
                logging.error(f"Unexpected error processing clip {i+1}: {str(e)}")
                logging.error(traceback.format_exc())
            
            logging.info(f"Moving to next clip")
    except Exception as e:
        logging.error(f"Unexpected error in main loop: {str(e)}")
        logging.error(traceback.format_exc())

    logging.info("Video splitting process completed")

# Usage
input_video = "video5.mp4"  # Replace with your video file name
srt_file = "transcription.srt"   # Replace with your SRT file name

split_video(input_video, srt_file)

# Keep the console window open to view logs
input("Press Enter to exit...")
