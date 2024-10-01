import whisper
import sys
import requests
import os
from pydub import AudioSegment
from pydub.playback import play

# ElevenLabs API key and voice ID
ELEVENLABS_API_KEY = "sk_5967397e69fac16f0f0ffe3a1ea9c506f27f962ccceb30af"
VOICE_ID = "cgSgspJ2msm6clMCkdW9"  # Example voice ID, you can change this

def transcribe_audio(file_path):
    print("Loading Whisper model...")
    model = whisper.load_model("base")
    
    print(f"Transcribing {file_path}...")
    result = model.transcribe(file_path)
    
    return result["text"]

def text_to_speech(text):
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}"
    
    headers = {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": ELEVENLABS_API_KEY
    }

    data = {
        "text": text,
        "model_id": "eleven_monolingual_v1",
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.5
        }
    }

    response = requests.post(url, json=data, headers=headers)
    
    if response.status_code == 200:
        return response.content
    else:
        raise Exception(f"Error in text-to-speech API: {response.text}")

def save_and_play_audio(audio_content, output_file="output.mp3"):
    with open(output_file, "wb") as f:
        f.write(audio_content)
    
    print(f"Audio saved as {output_file}")
    
    # Play the audio
    audio = AudioSegment.from_mp3(output_file)
    play(audio)

def main():
    if len(sys.argv) != 2:
        print("Usage: python whisper_elevenlabs.py <path_to_audio_file>")
        sys.exit(1)
    
    file_path = sys.argv[1]
    
    try:
        # Transcribe audio
        transcription = transcribe_audio(file_path)
        print("\nTranscription:")
        print(transcription)

        # Convert transcription to speech
        print("\nConverting transcription to speech...")
        speech_audio = text_to_speech(transcription)

        # Save and play the resulting audio
        save_and_play_audio(speech_audio)

    except Exception as e:
        print(f"An error occurred: {str(e)}")

if __name__ == "__main__":
    main()
