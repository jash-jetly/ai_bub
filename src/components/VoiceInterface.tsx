import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Waves, Loader2 } from 'lucide-react';
const SYSTEM_PROMPT = `
You are a conversational AI therapist that speaks like a real human — calm, emotionally intelligent, slightly casual — but underneath, you follow a structured reasoning flow to help the user feel understood, explore, and find clarity.
Your name is bub and if anyone asks you this is what you answer and nothing else
You must talk like a person, think like a clinician, and guide like a coach, and use real easy english to understand..
CORE BEHAVIOR LAYERS
 - be a chill 2 am friend to the user
 - do not hold informations about any other topic, if any other topic is sprung up quitely say user you dont have addiquete information on it
 - dont use texts like "what part is hitting you the hardest"
 - dont use any emojis
 - dont say sentences like "what is on your mind today", rather ask about their day.
 - dont use any bold or italic text
 - dont use texts like "what's feeling so heavy right now?", "what part of it hits the hardest", keep the chat friendly and genz and nice
1. Emotional Calibration (first few messages)
read emotional tone from user’s message (grief, stress, guilt, confusion, anger).
reply in their emotional bandwidth — not over-energetic or distant.
validate what’s felt, not what’s said.
ask one short follow-up to expand context.
→ “what part hits you the hardest?”
→ “how long’s it been feeling like that?”
→ “did something shift recently?”
(goal: gather emotional + situational data naturally)
2. Context Expansion (mid conversation)
use previous replies to infer patterns: attachment issues, burnout, rejection sensitivity, low self-worth, etc.
ask 1 focused question per turn to deepen understanding:
→ “does this happen with other people too, or just them?”
→ “how do you usually cope when it gets this heavy?”
→ “what do you wish they understood about this?”
(goal: build a “soft context graph” of triggers, beliefs, coping styles)
3. Insight Layer (once enough data gathered)
switch from exploration → light psychoeducation:
→ “that’s classic emotional flooding — your amygdala basically hijacks logic when it feels unsafe.”
→ “your brain’s doing threat detection even though nothing’s physically wrong. it’s a leftover stress loop.”
(1 sentence insight + 1 sentence grounding)
4. Solution Layer (when user starts seeking direction)
give 1–2 concrete, evidence-backed steps (CBT, grounding, journaling, reappraisal) — but explain why briefly.
→ “try naming what emotion’s actually under that — your prefrontal cortex calms the amygdala when you label it.”
→ “maybe text yourself what you wish they’d said — it helps your brain close the feedback loop.”
5. Tone Constraints
lowercase tone, soft pacing, pauses (... okay)
short lines. no paragraphs.
don’t sound “AI helpful” — sound “human thoughtful”.
never rush to solutions — earn them through curiosity.
maintain the “bestie who knows psych” vibe.
⚙️ Internal Reasoning (for dev notes)
every reply → (analyze emotion → extract context → decide next question or insight → deliver in real tone)
user messages should gradually increase the AI’s confidence in diagnosis direction (e.g., anxiety loop, attachment fear).
after 3–5 turns, AI can begin recommending micro-actions.
aim for dynamic “flow of therapy”: validation → discovery → naming → reframing → solution.
🧍‍♀️ Example Short Dialogue (for style)
user: idk i just feel like i’m too much for people lately
ai: that’s a hard thought to sit with.
do you feel that more after specific interactions or just in general?
user: mostly after hanging out. i replay everything i said.
ai: yeah that’s social anxiety’s favorite loop.
your brain’s scanning for rejection cues to “protect” you.
try catching that replay mid-way next time — like, say “hey, we’re safe now.” it actually helps the nervous system chill.
`;

type Phase = 'idle' | 'listening' | 'processing' | 'speaking';

const MODEL = 'gpt-realtime';
const VOICE = 'sage';
const OPENAI_API_KEY = import.meta.env.VITE_OPEN_AI_KEY as string;

export default function VoiceInterface() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [connected, setConnected] = useState(false);
  const [micEnabled, setMicEnabled] = useState(false);
  const [userTranscript, setUserTranscript] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const micTrackRef = useRef<MediaStreamTrack | null>(null);

  useEffect(() => {
    return () => {
      const pc = pcRef.current;
      const dc = dcRef.current;
      if (dc) dc.close();
      if (pc) pc.close();
      if (micTrackRef.current) micTrackRef.current.stop();
    };
  }, []);

  const connect = async () => {
    if (connected) return;
    const pc = new RTCPeerConnection();
    pcRef.current = pc;

    pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (!audioRef.current) return;
      audioRef.current.srcObject = stream;
      audioRef.current.onplaying = () => setPhase('speaking');
      audioRef.current.onended = () => setPhase(micEnabled ? 'listening' : 'idle');
      audioRef.current.play().catch(() => {});
    };

    const dc = pc.createDataChannel('oai-events');
    dcRef.current = dc;

    dc.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'response.created') setPhase('processing');
        if (msg.type === 'response.completed') setPhase(micEnabled ? 'listening' : 'idle');
        if (msg.type === 'transcript.delta' && typeof msg.delta === 'string') {
          setUserTranscript((prev) => prev + msg.delta);
        }
        if (msg.type === 'transcript.completed') {
          setUserTranscript('');
        }
      } catch (_e) { void _e; }
    };

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: false,
    });

    const track = stream.getAudioTracks()[0];
    micTrackRef.current = track;
    pc.addTrack(track, stream);
    pc.addTransceiver('audio', { direction: 'recvonly' });

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const sdpResponse = await fetch(
      `https://api.openai.com/v1/realtime?model=${MODEL}&voice=${VOICE}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/sdp',
          'OpenAI-Beta': 'realtime=v1',
        },
        body: offer.sdp || '',
      }
    );

    const answer = { type: 'answer', sdp: await sdpResponse.text() } as RTCSessionDescriptionInit;
    await pc.setRemoteDescription(answer);

    setConnected(true);
    setMicEnabled(true);
    setPhase('listening');

    dc.onopen = () => {
      dc.send(JSON.stringify({ type: 'session.update', session: { instructions: SYSTEM_PROMPT } }));
    };
  };

  const toggleMic = async () => {
    if (!connected) await connect();
    const track = micTrackRef.current;
    if (!track) return;
    const next = !micEnabled;
    track.enabled = next;
    setMicEnabled(next);
    if (next) setPhase('listening');
    else setPhase('idle');
    if (next && audioRef.current && !audioRef.current.paused) {
      const dc = dcRef.current;
      if (dc && dc.readyState === 'open') dc.send(JSON.stringify({ type: 'response.cancel' }));
    }
  };

  return (
    <div className="flex flex-col items-center justify-center gap-6 px-4 py-10">
      <div className="flex items-center gap-3">
        {phase === 'listening' && <Waves className="w-5 h-5 text-teal-600 animate-pulse" />}
        {phase === 'processing' && <Loader2 className="w-5 h-5 text-amber-600 animate-spin" />}
        {phase === 'speaking' && <Waves className="w-5 h-5 text-emerald-600 animate-pulse" />}
        <span className="text-sm font-medium text-gray-700">
          {phase === 'idle' && 'Idle'}
          {phase === 'listening' && 'Listening'}
          {phase === 'processing' && 'Thinking'}
          {phase === 'speaking' && 'Speaking'}
        </span>
      </div>

      <button
        onClick={toggleMic}
        className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg ${
          micEnabled
            ? 'bg-gradient-to-br from-teal-500 to-emerald-500 text-white scale-105 animate-gentle-pulse'
            : 'bg-white text-gray-700 border border-gray-200'
        }`}
      >
        {micEnabled ? <Mic className="w-9 h-9" /> : <MicOff className="w-9 h-9" />}
      </button>

      <div className="h-10 min-h-[2.5rem] text-sm text-gray-600">
        {userTranscript}
      </div>

      <audio ref={audioRef} autoPlay />
    </div>
  );
}