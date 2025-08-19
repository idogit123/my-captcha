from io import BytesIO
import speech_recognition as sr
from fuzzywuzzy import fuzz

recognizer = sr.Recognizer()

def transcribe_audio(audio_buffer: BytesIO):
    """
    Transcribes the given audio buffer to text.
    """
    with sr.AudioFile(audio_buffer) as source:
        audio = recognizer.record(source)
    try:
        return { "success": True, "text": recognizer.recognize_google(audio) }
    except sr.UnknownValueError:
        return { "success": False, "error": "Could not understand audio" }
    except sr.RequestError:
        return { "success": False, "error": "Could not request results from Google Speech Recognition service" }

def get_similarity_score(text1: str, text2: str) -> int:
    """
    Computes the similarity score between two texts.
    """
    return fuzz.ratio(text1, text2)