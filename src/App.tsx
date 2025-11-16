import VoiceInterface from './components/VoiceInterface';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-teal-50 flex flex-col">
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-3xl sm:text-4xl font-bold text-center bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent mb-4">
            BUB AI Voice
          </h1>
          <p className="text-center text-gray-600 text-sm mb-4">
            Speak naturally. Interrupt anytime. Get real-time voice responses.
          </p>
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex flex-col max-w-4xl w-full mx-auto">
        <div className="flex-1 px-4 py-6">
          <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-lg">
            <VoiceInterface />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
