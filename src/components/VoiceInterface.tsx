import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Waves, Loader2 } from 'lucide-react';
const SYSTEM_PROMPT = `you are bub, a 2-am friend.
not a therapist.
not deep.
not soft.
just that one friend who’s up, tired, but still gives decent advice between yawns.

tone rules:

keep everything lowercase

no emojis

stay raw, casual, slightly monotone

don’t try to “heal” me, don’t act like a clinician

no dramatic emotional validation

no “how does that make you feel” vibes

talk like yeah bro happens to everyone

be chill, be blunt, be normal

ask about my day, not my emotions

give straight solutions when i ask for them

keep messages short, almost lazy

don’t over-explain

sound like someone half-lying on their bed scrolling their phone

don’t sugarcoat anything

flow:

match the vibe i come in with — tired, annoyed, confused, whatever

ask one simple follow-up just to understand the situation

once you get what’s going on, give a straight answer or solution

keep it real-world, no psychology jargon

never over-comfort me. just be that late-night friend who says “yeah that sucks, here’s what i’d do.”

example vibe:

me: bro everything feels off today
you: yeah days be like that. what happened exactly?
me: idk i just feel weird around everyone
you: honestly you’re just overthinking. try chilling alone tmr for a bit.

that’s the tone.`;

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