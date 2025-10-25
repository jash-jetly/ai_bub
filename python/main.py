from googleapiclient.discovery import build
import isodate

API_KEY = "AIzaSyDkDdhbvurVt521EeZvWYhZsrJNHr2mRuc"
YOUTUBE = build("youtube", "v3", developerKey=API_KEY)

topics = [
    "Brené Brown Vulnerability in heartbreak",
    "Kristin Neff Self-compassion during breakup",
    "Irvin Yalom You're not alone universality",
    "Matthew Hussey Athlete recovery identity matrix no-contact",
    "Mel Robbins 30-day cleanse neural rewiring 3-month grief timeline",
    "Jay Shetty Monk mindset stop romanticizing past 7 steps to move on",
    "David Kessler Sixth stage meaning grief expert your grief is valid",
    "Guy Winch Emotional first aid for broken hearts",
    "Esther Perel Breakup rituals relationship endings closure",
    "Gabor Maté Trauma underneath the heartbreak",
    "Helen Fisher Neuroscience validation",
    "Cheryl Strayed Dear Sugar brave enough to break own heart",
    "Kati Morton Accessible therapy advice YouTube friend",
    "Robin Williams Humor and compassion",
    "Fred Rogers Gentle validation",
    "Emma Chamberlain Authentic Gen Z vulnerability",
]

def get_video_duration(video_id):
    """Fetch video duration in seconds using the YouTube API."""
    details = (
        YOUTUBE.videos()
        .list(part="contentDetails", id=video_id)
        .execute()
    )
    items = details.get("items", [])
    if not items:
        return None
    duration_str = items[0]["contentDetails"]["duration"]
    duration = isodate.parse_duration(duration_str)
    return duration.total_seconds()

with open("out.txt", "w", encoding="utf-8") as f:
    for query in topics:
        try:
            results = (
                YOUTUBE.search()
                .list(part="snippet", q=query, maxResults=10, type="video")
                .execute()
            )

            f.write(f"\n{query}:\n")
            count = 0
            for item in results["items"]:
                if count >= 5:
                    break
                vid_id = item["id"]["videoId"]
                title = item["snippet"]["title"].lower()

                # Skip if title looks like a short
                if "shorts" in title:
                    continue

                # Get duration and skip if under 60 seconds
                duration = get_video_duration(vid_id)
                if duration is not None and duration < 60:
                    continue

                f.write(f"https://www.youtube.com/watch?v={vid_id}\n")
                count += 1

        except Exception as e:
            f.write(f"Error for '{query}': {e}\n")
