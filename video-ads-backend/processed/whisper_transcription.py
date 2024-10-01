import whisper
import sys

def transcribe_audio(file_path):
    print("Loading Whisper model...")
    model = whisper.load_model("base")  # You can change this to "medium" or "large" for potentially better results
    
    print(f"Transcribing {file_path}...")
    result = model.transcribe(file_path)
    
    return result["text"]

def main():
    if len(sys.argv) != 2:
        print("Usage: python whisper_transcription.py <path_to_audio_file>")
        sys.exit(1)
    
    file_path = sys.argv[1]
    
    try:
        transcription = transcribe_audio(file_path)
        print("\nTranscription:")
        print(transcription)
    except Exception as e:
        print(f"An error occurred: {str(e)}")

if __name__ == "__main__":
    main()
