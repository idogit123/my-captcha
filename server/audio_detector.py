from transformers import pipeline
from dotenv import load_dotenv
from os import getenv
from io import BytesIO
from scipy.io import wavfile

# Load the pipeline for deepfake audio detection
load_dotenv()
MODEL_NAME = getenv("MODEL_NAME")
detector = pipeline("audio-classification", model=MODEL_NAME)

def is_audio_deepfake(audio_buffer: BytesIO):
    """
    Determines whether the given audio file is a deepfake.

    Args:
        audio_buffer (BytesIO): A binary stream representing the audio file to be analyzed.

    Returns:
        A list of dictionaries with 'label' and 'score' keys, e.g.
            [
                {"label": "real", "score": 0.85},
                {"label": "fake", "score": 0.15}
            ]
    """
    sample_rate, audio_array = wavfile.read(audio_buffer)
    try:
        result = detector(audio_array)
        return result
    except Exception as e:
        print(f"Error occurred while detecting deepfake: {e}")
        return None
