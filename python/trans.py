"""
Generate minute-by-minute transcripts for multiple YouTube videos
listed under mentors in out.txt.

Each mentor section in out.txt looks like:

Emma Chamberlain Authentic Gen Z vulnerability:
https://youtube.com/watch?v=xxxx
https://youtube.com/watch?v=yyyy

Output files:
emma_1.txt, emma_2.txt, ...
"""

from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.proxies import WebshareProxyConfig
from urllib.parse import urlparse, parse_qs
import math
import os
import re
import time
from tqdm import tqdm

# -------------- Proxy Configuration ------------------

def create_proxy_api():
    """Create YouTubeTranscriptApi with webshare proxy configuration."""
    proxy_config = WebshareProxyConfig(
        proxy_username="yxuebnob",
        proxy_password="hcd39lseo3ow"
    )
    
    return YouTubeTranscriptApi(proxy_config=proxy_config)

# -------------- Utility Functions ------------------

def get_video_id(url: str) -> str:
    """Extract YouTube video ID from URL."""
    query = urlparse(url)
    if query.hostname == 'youtu.be':
        return query.path[1:]
    elif query.hostname in {'www.youtube.com', 'youtube.com', 'm.youtube.com'}:
        return parse_qs(query.query).get('v', [None])[0]
    return None


def detect_speaker_changes(transcript):
    """Detect speaker changes based on timing gaps and text patterns."""
    speaker_segments = []
    current_speaker = "Host"
    speaker_count = 0
    
    for i, entry in enumerate(transcript):
        text = entry['text'].replace('\n', ' ').strip()
        if not text:
            continue
            
        # Check for speaker change indicators
        speaker_changed = False
        
        # Look for timing gaps (longer than 2 seconds suggests speaker change)
        if i > 0:
            time_gap = entry['start'] - (transcript[i-1]['start'] + transcript[i-1]['duration'])
            if time_gap > 2.0:
                speaker_changed = True
        
        # Look for conversational patterns that suggest speaker change
        conversation_starters = [
            'yeah', 'yes', 'no', 'well', 'so', 'but', 'and', 'actually', 
            'i think', 'i mean', 'you know', 'right', 'exactly', 'absolutely',
            'question', 'answer', 'thanks', 'thank you'
        ]
        
        text_lower = text.lower()
        if any(text_lower.startswith(starter) for starter in conversation_starters):
            if i > 0:  # Don't change speaker for the first entry
                speaker_changed = True
        
        # Change speaker if indicators suggest it
        if speaker_changed:
            speaker_count += 1
            current_speaker = "Guest" if current_speaker == "Host" else "Host"
        
        speaker_segments.append({
            'start': entry['start'],
            'duration': entry['duration'],
            'text': text,
            'speaker': current_speaker
        })
    
    return speaker_segments


def create_minute_chunks_with_speakers(speaker_segments):
    """Group transcript text by minute with speaker labels."""
    chunks = {}
    for entry in speaker_segments:
        minute = math.floor(entry['start'] / 60)
        speaker = entry['speaker']
        text = entry['text']
        
        if text:
            if minute not in chunks:
                chunks[minute] = []
            chunks[minute].append(f"{speaker}: {text}")
    
    return chunks


def save_transcript_with_speakers(chunks, filename):
    """Save per-minute transcript with speaker labels into a file."""
    with open(filename, "w", encoding="utf-8") as f:
        f.write("=== TRANSCRIPT WITH SPEAKER DETECTION ===\n")
        f.write("Note: Speaker detection is based on timing and conversation patterns\n")
        f.write("Host = Primary speaker, Guest = Secondary speaker\n\n")
        
        for minute in sorted(chunks.keys()):
            f.write(f"\n--- Minute {minute + 1} ---\n")
            for entry in chunks[minute]:
                f.write(f"{entry}\n")


def create_minute_chunks(transcript):
    """Group transcript text by minute (legacy function for compatibility)."""
    chunks = {}
    for entry in transcript:
        minute = math.floor(entry['start'] / 60)
        text = entry['text'].replace('\n', ' ').strip()
        if text:
            chunks.setdefault(minute, []).append(text)
    return chunks


def save_transcript(chunks, filename):
    """Save per-minute transcript into a file (legacy function for compatibility)."""
    with open(filename, "w", encoding="utf-8") as f:
        for minute in sorted(chunks.keys()):
            combined_text = " ".join(chunks[minute])
            f.write(f"\nMinute {minute + 1}:\n{combined_text}\n")


# -------------- Main Logic ------------------

def process_videos_from_file(input_file="out.txt"):
    """Read out.txt, parse mentors & video links, and save transcripts."""
    start_time = time.time()
    
    # Setup proxy to bypass IP blocking
    print("🌐 Setting up webshare proxy...")
    ytt_api = create_proxy_api()
    print("✅ Proxy configured successfully")
    
    with open(input_file, "r", encoding="utf-8") as f:
        lines = [line.strip() for line in f if line.strip()]

    current_mentor = None
    mentor_links = {}

    for line in lines:
        if line.endswith(":"):  # New mentor section
            current_mentor = line[:-1]
            mentor_links[current_mentor] = []
        elif line.startswith("http"):
            if current_mentor:
                mentor_links[current_mentor].append(line)

    # Create output folder
    os.makedirs("transcripts", exist_ok=True)

    # Calculate total videos for progress bar
    total_videos = sum(len(links) for links in mentor_links.values())
    successful_downloads = 0
    failed_downloads = 0
    
    print(f"🚀 Starting transcript processing for {total_videos} videos...")
    
    # Create progress bar
    with tqdm(total=total_videos, desc="Processing videos", unit="video") as pbar:
        for mentor, links in mentor_links.items():
            # Simplify mentor name for filenames
            short_name = re.sub(r"[^a-zA-Z]", "", mentor.split()[0]).lower()
            pbar.set_description(f"Processing {mentor}")

            for idx, link in enumerate(links, start=1):
                video_id = get_video_id(link)
                if not video_id:
                    pbar.write(f"  ⚠️ Skipping invalid URL: {link}")
                    failed_downloads += 1
                    pbar.update(1)
                    continue

                try:
                    fetched_transcript = ytt_api.fetch(video_id)
                    transcript = fetched_transcript.to_raw_data()
                    
                    # Generate regular transcript
                    chunks = create_minute_chunks(transcript)
                    filename = os.path.join("transcripts", f"{short_name}_{idx}.txt")
                    save_transcript(chunks, filename)
                    
                    # Generate speaker-detected transcript
                    speaker_segments = detect_speaker_changes(transcript)
                    speaker_chunks = create_minute_chunks_with_speakers(speaker_segments)
                    speaker_filename = os.path.join("transcripts", f"{short_name}_{idx}_speakers.txt")
                    save_transcript_with_speakers(speaker_chunks, speaker_filename)
                    
                    pbar.write(f"  ✅ Saved: {filename}")
                    pbar.write(f"  🎭 Saved with speakers: {speaker_filename}")
                    successful_downloads += 1

                except Exception as e:
                    pbar.write(f"  ❌ Could not fetch transcript for {link}: {e}")
                    failed_downloads += 1
                
                pbar.update(1)
    
    # Calculate completion time
    end_time = time.time()
    total_time = end_time - start_time
    minutes = int(total_time // 60)
    seconds = int(total_time % 60)
    
    # Print completion message
    print("\n" + "="*60)
    print("🎉 TRANSCRIPT PROCESSING COMPLETED!")
    print("="*60)
    print(f"📊 Summary:")
    print(f"   • Total videos processed: {total_videos}")
    print(f"   • Successful downloads: {successful_downloads}")
    print(f"   • Failed downloads: {failed_downloads}")
    print(f"   • Success rate: {(successful_downloads/total_videos*100):.1f}%")
    print(f"⏱️  Total time: {minutes}m {seconds}s")
    print(f"📁 Output folder: transcripts/")
    print("="*60)


if __name__ == "__main__":
    process_videos_from_file("out.txt")
