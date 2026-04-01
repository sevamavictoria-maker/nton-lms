import { useState, useEffect, useRef, useCallback } from 'react'
import { Volume2, VolumeX, Pause, Play, SkipForward, Settings } from 'lucide-react'

const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY || ''
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/text-to-speech'

const ELEVENLABS_VOICES = [
  { id: 'fCqNx624ZlenYx5PXk6M', name: 'Female (AU)' },
  { id: 'snyKKuaGYk1VUEh42zbW', name: 'Male (AU)' },
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella' },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni' },
]

type TTSEngine = 'elevenlabs' | 'browser'

interface Props {
  text: string
  autoStop?: boolean
}

// Cache for ElevenLabs audio blobs keyed by voice_id + text
const audioCache = new Map<string, string>()

export function TextToSpeech({ text, autoStop }: Props) {
  const [speaking, setSpeaking] = useState(false)
  const [paused, setPaused] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [rate, setRate] = useState(1)
  const [engine, setEngine] = useState<TTSEngine>('elevenlabs')
  const [activeEngine, setActiveEngine] = useState<TTSEngine>('elevenlabs')
  const [elVoiceIndex, setElVoiceIndex] = useState(0)
  const [browserVoiceIndex, setBrowserVoiceIndex] = useState(0)
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([])
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const loadVoices = () => {
      const available = speechSynthesis.getVoices().filter((v) => v.lang.startsWith('en'))
      if (available.length > 0) setBrowserVoices(available)
    }
    loadVoices()
    speechSynthesis.onvoiceschanged = loadVoices
    return () => { speechSynthesis.onvoiceschanged = null }
  }, [])

  useEffect(() => {
    if (autoStop) {
      stop()
    }
  }, [text, autoStop])

  // Cleanup audio element on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      speechSynthesis.cancel()
    }
  }, [])

  // Clean HTML tags and entities for speech
  const cleanText = (html: string) => {
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim()
  }

  const stop = useCallback(() => {
    speechSynthesis.cancel()
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    setSpeaking(false)
    setPaused(false)
    setLoading(false)
  }, [])

  const speakWithBrowser = useCallback((cleaned: string) => {
    speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(cleaned)
    utterance.rate = rate
    if (browserVoices[browserVoiceIndex]) {
      utterance.voice = browserVoices[browserVoiceIndex]
    }
    utterance.onend = () => {
      setSpeaking(false)
      setPaused(false)
    }
    utterance.onerror = () => {
      setSpeaking(false)
      setPaused(false)
    }
    utteranceRef.current = utterance
    speechSynthesis.speak(utterance)
    setSpeaking(true)
    setPaused(false)
    setActiveEngine('browser')
  }, [rate, browserVoices, browserVoiceIndex])

  const speakWithElevenLabs = useCallback(async (cleaned: string) => {
    const voiceId = ELEVENLABS_VOICES[elVoiceIndex].id
    const cacheKey = `${voiceId}:${cleaned}`

    // Check cache first
    let audioUrl = audioCache.get(cacheKey)

    if (!audioUrl) {
      setLoading(true)
      try {
        const response = await fetch(`${ELEVENLABS_API_URL}/${voiceId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': ELEVENLABS_API_KEY,
          },
          body: JSON.stringify({
            text: cleaned,
            model_id: 'eleven_monolingual_v1',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.5,
            },
          }),
        })

        if (!response.ok) {
          throw new Error(`ElevenLabs API error: ${response.status}`)
        }

        const blob = await response.blob()
        audioUrl = URL.createObjectURL(blob)
        audioCache.set(cacheKey, audioUrl)
      } catch {
        // Fallback to browser TTS
        setLoading(false)
        speakWithBrowser(cleaned)
        return
      }
      setLoading(false)
    }

    // Play the audio
    if (audioRef.current) {
      audioRef.current.pause()
    }
    const audio = new Audio(audioUrl)
    audio.playbackRate = rate
    audio.onended = () => {
      setSpeaking(false)
      setPaused(false)
    }
    audio.onerror = () => {
      // Fallback to browser TTS on playback error
      speakWithBrowser(cleaned)
    }
    audioRef.current = audio
    audio.play()
    setSpeaking(true)
    setPaused(false)
    setActiveEngine('elevenlabs')
  }, [elVoiceIndex, rate, speakWithBrowser])

  const speak = useCallback(() => {
    if (speaking && paused) {
      // Resume
      if (activeEngine === 'elevenlabs' && audioRef.current) {
        audioRef.current.play()
        setPaused(false)
      } else {
        speechSynthesis.resume()
        setPaused(false)
      }
      return
    }

    stop()
    const cleaned = cleanText(text)
    if (!cleaned) return

    if (engine === 'elevenlabs') {
      speakWithElevenLabs(cleaned)
    } else {
      speakWithBrowser(cleaned)
    }
  }, [speaking, paused, activeEngine, text, engine, stop, speakWithElevenLabs, speakWithBrowser])

  const pause = useCallback(() => {
    if (activeEngine === 'elevenlabs' && audioRef.current) {
      audioRef.current.pause()
    } else {
      speechSynthesis.pause()
    }
    setPaused(true)
  }, [activeEngine])

  return (
    <div className="inline-flex items-center gap-1 bg-brand-50 border border-brand-200 rounded-lg px-2 py-1">
      {!speaking && !loading ? (
        <button
          onClick={speak}
          className="flex items-center gap-1.5 text-brand-700 hover:text-brand-900 text-sm font-medium px-1 py-0.5"
          title="Listen to this slide"
        >
          <Volume2 size={16} />
          <span>Listen</span>
        </button>
      ) : loading ? (
        <div className="flex items-center gap-1.5 text-brand-600 text-sm font-medium px-1 py-0.5">
          <div className="w-4 h-4 border-2 border-brand-300 border-t-brand-600 rounded-full animate-spin" />
          <span>Generating...</span>
        </div>
      ) : (
        <>
          {paused ? (
            <button onClick={speak} className="p-1 text-brand-700 hover:text-brand-900" title="Resume">
              <Play size={16} />
            </button>
          ) : (
            <button onClick={pause} className="p-1 text-brand-700 hover:text-brand-900" title="Pause">
              <Pause size={16} />
            </button>
          )}
          <button onClick={stop} className="p-1 text-red-500 hover:text-red-700" title="Stop">
            <VolumeX size={16} />
          </button>
          <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
          <span className="text-[10px] text-brand-500 font-medium ml-0.5">
            {activeEngine === 'elevenlabs' ? 'AI' : 'Browser'}
          </span>
        </>
      )}

      <button
        onClick={() => setShowSettings(!showSettings)}
        className="p-1 text-brand-400 hover:text-brand-600"
        title="Voice settings"
      >
        <Settings size={14} />
      </button>

      {showSettings && (
        <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 w-72 z-50">
          <div className="space-y-3">
            {/* Engine selector */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">TTS Engine</label>
              <div className="flex gap-1">
                <button
                  onClick={() => setEngine('elevenlabs')}
                  className={`flex-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                    engine === 'elevenlabs'
                      ? 'bg-brand-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  ElevenLabs AI
                </button>
                <button
                  onClick={() => setEngine('browser')}
                  className={`flex-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                    engine === 'browser'
                      ? 'bg-brand-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Browser TTS
                </button>
              </div>
            </div>

            {/* Speed */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Speed: {rate}x</label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={rate}
                onChange={(e) => setRate(parseFloat(e.target.value))}
                className="w-full accent-brand-600"
              />
            </div>

            {/* Voice selector */}
            {engine === 'elevenlabs' ? (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">ElevenLabs Voice</label>
                <select
                  value={elVoiceIndex}
                  onChange={(e) => setElVoiceIndex(parseInt(e.target.value))}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                >
                  {ELEVENLABS_VOICES.map((voice, i) => (
                    <option key={voice.id} value={i}>{voice.name}</option>
                  ))}
                </select>
              </div>
            ) : browserVoices.length > 0 ? (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Browser Voice</label>
                <select
                  value={browserVoiceIndex}
                  onChange={(e) => setBrowserVoiceIndex(parseInt(e.target.value))}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                >
                  {browserVoices.map((voice, i) => (
                    <option key={i} value={i}>{voice.name}</option>
                  ))}
                </select>
              </div>
            ) : null}

            <button
              onClick={() => { stop(); setTimeout(() => speak(), 50) }}
              className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-800"
            >
              <SkipForward size={12} /> Restart with new settings
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
