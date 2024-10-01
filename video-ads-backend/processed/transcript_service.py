import speech_recognition as sr
from pydub import AudioSegment
import os

def mp3_to_wav(mp3_file):
    wav_file = mp3_file.replace('.mp3', '.wav')
    sound = AudioSegment.from_mp3(mp3_file)
    sound.export(wav_file, format="wav")
    return wav_file

def transcribe_audio(file_path):
    recognizer = sr.Recognizer()
    
    # Convert MP3 to WAV if necessary
    if file_path.endswith('.mp3'):
        file_path = mp3_to_wav(file_path)
    
    with sr.AudioFile(file_path) as source:
        audio = recognizer.record(source)
    
    try:
        text = recognizer.recognize_google(audio)
        return text
    except sr.UnknownValueError:
        return "Speech Recognition could not understand the audio"
    except sr.RequestError as e:
        return f"Could not request results from Speech Recognition service; {e}"

def main():
    print("Simple Local Transcription Service")
    file_path = input("Enter the path to your audio file (MP3 or WAV): ")
    
    if not os.path.exists(file_path):
        print("File not found. Please check the path and try again.")
        return
    
    print("Transcribing... This may take a while depending on the file size.")
    transcription = transcribe_audio(file_path)
    
    print("\nTranscription:")
    print(transcription)

if __name__ == "__main__":
    main()
