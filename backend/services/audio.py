import librosa
import numpy as np

def analyze_audio_physical(file_path: str) -> dict:
    try:
        y, sr = librosa.load(file_path, sr=None)
        
        # 1. Pitch Variation (f0 standard deviation)
        # Using librosa's piptrack to estimate f0
        pitches, magnitudes = librosa.piptrack(y=y, sr=sr)
        
        # Extract the highest magnitude pitch for each frame
        f0 = []
        for t in range(pitches.shape[1]):
            index = magnitudes[:, t].argmax()
            pitch = pitches[index, t]
            if pitch > 50 and pitch < 500: # Filter typical human voice range
                f0.append(pitch)
        
        if len(f0) > 0:
            pitch_std = np.std(f0)
            if pitch_std < 10:
                pitch_variation = "Monotone"
            elif pitch_std > 50:
                pitch_variation = "Highly Expressive"
            else:
                pitch_variation = "Dynamic"
        else:
            pitch_variation = "Unknown"
            
        # 2. Hesitation / Pauses
        # Detect non-silent intervals
        non_mute_intervals = librosa.effects.split(y, top_db=30)
        
        # Calculate total duration and speaking duration
        total_duration = librosa.get_duration(y=y, sr=sr)
        speaking_duration = sum([(end - start)/sr for start, end in non_mute_intervals])
        
        # Count pauses longer than 1 second
        pauses = 0
        if len(non_mute_intervals) > 1:
            for i in range(1, len(non_mute_intervals)):
                pause_len = (non_mute_intervals[i][0] - non_mute_intervals[i-1][1]) / sr
                if pause_len > 1.0:
                    pauses += 1
                    
        return {
            "pitch_variation": pitch_variation,
            "pauses": pauses
        }
    except Exception as e:
        print(f"Error in audio physical analysis: {e}")
        return {
            "pitch_variation": "Unknown",
            "pauses": 0
        }
