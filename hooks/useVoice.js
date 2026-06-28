import { useState, useRef, useEffect, useCallback } from "react";

// Maps the dashboard's lang codes to BCP-47 language tags
const LANG_MAP = {
  en: "en-US",
  ru: "ru-RU",
  az: "az-AZ",
};

// ─── Speech Recognition (mic → text) ─────────────────────────────────────────
export function useSpeechRecognition({ onResult, language = "en" }) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    setIsSupported(
      !!(window.SpeechRecognition || window.webkitSpeechRecognition)
    );
  }, []);

  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    const recognition = new SR();
    recognition.lang = LANG_MAP[language] ?? "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      onResult(transcript);
    };

    recognition.onerror = (e) => {
      console.warn("Speech recognition error:", e.error);
      setIsListening(false);
    };

    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
  }, [language, onResult]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  return { isListening, isSupported, startListening, stopListening };
}

// ─── Speech Synthesis (text → voice) ─────────────────────────────────────────
export function useSpeechSynthesis({ language = "en" }) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const utteranceRef = useRef(null);

  // Voices load asynchronously in some browsers — wait for them
  const getBestVoice = useCallback((langCode) => {
    const voices = window.speechSynthesis?.getVoices() ?? [];
    // Prefer exact match, then language prefix match
    return (
      voices.find((v) => v.lang === langCode) ??
      voices.find((v) => v.lang.startsWith(langCode.split("-")[0])) ??
      null
    );
  }, []);

  const speak = useCallback(
    (text) => {
      if (!window.speechSynthesis || !voiceEnabled || !text) return;

      // Cancel any ongoing speech first
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = LANG_MAP[language] ?? "en-US";
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      const voice = getBestVoice(utterance.lang);
      if (voice) utterance.voice = voice;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [language, voiceEnabled, getBestVoice]
  );

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }, []);

  const toggleVoice = useCallback(() => {
    setVoiceEnabled((prev) => {
      if (prev) window.speechSynthesis?.cancel(); // stop if disabling
      return !prev;
    });
  }, []);

  // Stop speaking on unmount
  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  return { isSpeaking, voiceEnabled, speak, stop, toggleVoice };
}
