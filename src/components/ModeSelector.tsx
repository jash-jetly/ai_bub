import { Brain, Users, Rocket, MessageSquare, MessageCircle } from 'lucide-react';

export type AIMode = 'general' | 'therapist' | 'friend' | 'coach' | 'moderator';

interface ModeSelectorProps {
  selectedMode: AIMode;
  onModeChange: (mode: AIMode) => void;
}

const modes = [
];

export function ModeSelector() {
  return (
    <div className="flex gap-2 sm:gap-3 justify-center flex-wrap px-4">
      
    </div>
  );
}
