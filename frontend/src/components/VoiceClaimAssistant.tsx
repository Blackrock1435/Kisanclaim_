import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Volume2, Sparkles, Check, ArrowRight, X, AlertCircle } from "lucide-react";

interface FieldItem {
  id: number;
  name: string;
  crop?: string;
  farm_name?: string;
  digipin?: string;
  area_ha?: number;
}

interface VoiceClaimAssistantProps {
  fields: FieldItem[];
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: {
    field_id: string;
    crop_name: string;
    disaster_type: string;
    incident_date: string;
    description: string;
  }) => void;
}

export default function VoiceClaimAssistant({
  fields,
  isOpen,
  onClose,
  onComplete,
}: VoiceClaimAssistantProps) {
  const [lang, setLang] = useState<"kn" | "en">("kn");
  const [stepIndex, setStepIndex] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [feedback, setFeedback] = useState("");

  const [collected, setCollected] = useState({
    field_id: fields[0] ? String(fields[0].id) : "",
    field_name: fields[0] ? fields[0].name : "",
    crop_name: fields[0]?.crop || "Paddy",
    disaster_type: "flood",
    incident_date: new Date().toISOString().slice(0, 10),
    description: "",
  });

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(typeof window !== "undefined" ? window.speechSynthesis : null);

  const steps = [
    {
      id: "field",
      titleEn: "Which field suffered crop damage?",
      titleKn: "ಯಾವ ಹೊಲದಲ್ಲಿ ಬೆಳೆ ಹಾನಿ ಸಂಭವಿಸಿದೆ?",
      hintEn: `Say: "${fields.map(f => f.name).join('" or "') || "Main Field"}"`,
      hintKn: `ಹೇಳಿ: "${fields.map(f => f.name).join('" ಅಥವಾ "') || "ಮುಖ್ಯ ಹೊಲ"}"`,
    },
    {
      id: "crop",
      titleEn: "What crop was grown in this field?",
      titleKn: "ಈ ಹೊಲದಲ್ಲಿ ಯಾವ ಬೆಳೆ ಬೆಳೆಯಲಾಗಿತ್ತು?",
      hintEn: 'Say: "Paddy", "Ragi", "Maize", "Cotton", or "Sugarcane"',
      hintKn: 'ಹೇಳಿ: "ಭತ್ತ (Paddy)", "ರಾಗಿ (Ragi)", "ಮೆಕ್ಕೆಜೋಳ", "ಹತ್ತಿ" ಅಥವಾ "ಕಬ್ಬು"',
    },
    {
      id: "disaster",
      titleEn: "What disaster caused the damage?",
      titleKn: "ಬೆಳೆ ಹಾನಿಗೆ ಯಾವ ನೈಸರ್ಗಿಕ ವಿಕೋಪ ಕಾರಣ?",
      hintEn: 'Say: "Flood", "Drought", "Hailstorm", or "Pest attack"',
      hintKn: 'ಹೇಳಿ: "ಪ್ರವಾಹ (Flood)", "ಬರಗಾಲ (Drought)", "ಆಲಿಕಲ್ಲು ಮಳೆ" ಅಥವಾ "ಕೀಟ ಬಾಧೆ"',
    },
    {
      id: "date",
      titleEn: "When did this disaster occur?",
      titleKn: "ಈ ಅನಾಹುತ ಯಾವ ದಿನಾಂಕದಂದು ಸಂಭವಿಸಿತು?",
      hintEn: 'Say: "Today", "Yesterday", or "2 days ago"',
      hintKn: 'ಹೇಳಿ: "ಇಂದು (Today)", "ನಿನ್ನೆ (Yesterday)" ಅಥವಾ "೨ ದಿನಗಳ ಹಿಂದೆ"',
    },
    {
      id: "description",
      titleEn: "Please briefly describe the condition of the field.",
      titleKn: "ದಯವಿಟ್ಟು ಬೆಳೆ ಹಾನಿಯ ಸಂಕ್ಷಿಪ್ತ ವಿವರಣೆಯನ್ನು ತಿಳಿಸಿ.",
      hintEn: 'Say: "Field was completely submerged in flood water for 3 days"',
      hintKn: 'ಹೇಳಿ: "ಮೂರು ದಿನಗಳ ಕಾಲ ಹೊಲ ಸಂಪೂರ್ಣವಾಗಿ ಪ್ರವಾಹದ ನೀರಿನಲ್ಲಿ ಮುಳುಗಿತ್ತು"',
    },
    {
      id: "confirm",
      titleEn: "Review your voice-filed claim details",
      titleKn: "ನಿಮ್ಮ ಧ್ವನಿ ಮೂಲಕ ದಾಖಲಿಸಿದ ಕ್ಲೈಮ್ ವಿವರಗಳನ್ನು ಪರಿಶೀಲಿಸಿ",
      hintEn: 'Say "Confirm" or click Apply to Form',
      hintKn: 'ಖಚಿತಪಡಿಸಿ ಅಥವಾ ಫಾರ್ಮ್‌ಗೆ ಅನ್ವಯಿಸಿ ಕ್ಲಿಕ್ ಮಾಡಿ',
    },
  ];

  const currentStep = steps[stepIndex];

  // Text to Speech
  const speak = (text: string) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === "kn" ? "kn-IN" : "en-IN";
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    synthRef.current.speak(utterance);
  };

  // Start Speech Recognition
  const startListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setFeedback(
        lang === "kn"
          ? "ನಿಮ್ಮ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಧ್ವನಿ ಗುರುತಿಸುವಿಕೆ ಬೆಂಬಲಿತವಾಗಿಲ್ಲ. ದಯವಿಟ್ಟು Chrome ಬಳಸಿ."
          : "Speech recognition not supported in this browser. Please use Chrome/Edge."
      );
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const rec = new SpeechRecognition();
      rec.lang = lang === "kn" ? "kn-IN" : "en-IN";
      rec.continuous = false;
      rec.interimResults = false;

      rec.onstart = () => {
        setIsListening(true);
        setFeedback(lang === "kn" ? "ಆಲಿಸುತ್ತಿದೆ... ಮಾತನಾಡಿ" : "Listening... speak now");
      };

      rec.onresult = (event: any) => {
        const spoken = event.results[0][0].transcript;
        setTranscript(spoken);
        handleSpokenInput(spoken);
      };

      rec.onerror = (e: any) => {
        setIsListening(false);
        setFeedback(lang === "kn" ? `ದೋಷ: ${e.error || "ಧ್ವನಿ ಕೇಳಿಸಲಿಲ್ಲ"}` : `Error: ${e.error || "No speech detected"}`);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (err: any) {
      setIsListening(false);
      setFeedback(err.message);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  // Process Natural Language Spoken Input
  const handleSpokenInput = (text: string) => {
    const clean = text.toLowerCase().trim();

    if (currentStep.id === "field") {
      const found = fields.find((f) => clean.includes(f.name.toLowerCase()));
      if (found) {
        setCollected((prev) => ({
          ...prev,
          field_id: String(found.id),
          field_name: found.name,
          crop_name: found.crop || prev.crop_name,
        }));
        speak(lang === "kn" ? `${found.name} ಆಯ್ಕೆ ಮಾಡಲಾಗಿದೆ. ಬೆಳೆ ಯಾವುದಾಗಿತ್ತು?` : `Selected ${found.name}. What was the crop?`);
        setStepIndex(1);
      } else if (fields.length > 0) {
        const first = fields[0];
        setCollected((prev) => ({
          ...prev,
          field_id: String(first.id),
          field_name: first.name,
        }));
        speak(lang === "kn" ? `${first.name} ಆಯ್ಕೆ ಮಾಡಲಾಗಿದೆ.` : `Selected ${first.name}.`);
        setStepIndex(1);
      }
    } else if (currentStep.id === "crop") {
      let crop = text.trim();
      if (clean.includes("ಭತ್ತ") || clean.includes("paddy") || clean.includes("rice")) crop = "Paddy";
      else if (clean.includes("ರಾಗಿ") || clean.includes("ragi") || clean.includes("millet")) crop = "Ragi";
      else if (clean.includes("ಮೆಕ್ಕೆಜೋಳ") || clean.includes("maize") || clean.includes("corn")) crop = "Maize";
      else if (clean.includes("ಹತ್ತಿ") || clean.includes("cotton")) crop = "Cotton";
      else if (clean.includes("ಕಬ್ಬು") || clean.includes("sugarcane")) crop = "Sugarcane";
      else if (clean.includes("ಗೋಧಿ") || clean.includes("wheat")) crop = "Wheat";

      setCollected((prev) => ({ ...prev, crop_name: crop }));
      speak(lang === "kn" ? `ಬೆಳೆ ${crop} ದಾಖಲಿಸಲಾಗಿದೆ. ಯಾವ ವಿಕೋಪ ಸಂಭವಿಸಿತು?` : `Crop recorded as ${crop}. What disaster caused the damage?`);
      setStepIndex(2);
    } else if (currentStep.id === "disaster") {
      let dis = "flood";
      if (clean.includes("ಪ್ರವಾಹ") || clean.includes("flood") || clean.includes("ನೀರು") || clean.includes("water")) dis = "flood";
      else if (clean.includes("ಬರಗಾಲ") || clean.includes("drought") || clean.includes("ಮಳೆ ಇಲ್ಲ")) dis = "drought";
      else if (clean.includes("ಆಲಿಕಲ್ಲು") || clean.includes("hail") || clean.includes("hailstorm")) dis = "hail";
      else if (clean.includes("ಕೀಟ") || clean.includes("ಹುಳು") || clean.includes("pest")) dis = "pest";
      else if (clean.includes("ಚಂಡಮಾರುತ") || clean.includes("cyclone") || clean.includes("storm")) dis = "cyclone";

      setCollected((prev) => ({ ...prev, disaster_type: dis }));
      speak(lang === "kn" ? `ವಿಕೋಪ ದಾಖಲಿಸಲಾಗಿದೆ. ಇದು ಯಾವ ದಿನಾಂಕದಂದು ನಡೆಯಿತು?` : `Disaster recorded. When did this happen?`);
      setStepIndex(3);
    } else if (currentStep.id === "date") {
      const now = new Date();
      let dt = now.toISOString().slice(0, 10);

      if (clean.includes("ನಿನ್ನೆ") || clean.includes("yesterday")) {
        const yest = new Date(now.setDate(now.getDate() - 1));
        dt = yest.toISOString().slice(0, 10);
      } else if (clean.includes("ಎರಡು ದಿನ") || clean.includes("೨ ದಿನ") || clean.includes("2 days ago")) {
        const d2 = new Date(now.setDate(now.getDate() - 2));
        dt = d2.toISOString().slice(0, 10);
      } else if (clean.includes("ಮೂರು ದಿನ") || clean.includes("3 days ago")) {
        const d3 = new Date(now.setDate(now.getDate() - 3));
        dt = d3.toISOString().slice(0, 10);
      }

      setCollected((prev) => ({ ...prev, incident_date: dt }));
      speak(lang === "kn" ? `ದಿನಾಂಕ ${dt} ದಾಖಲಿಸಲಾಗಿದೆ. ದಯವಿಟ್ಟು ನಷ್ಟದ ವಿವರ ತಿಳಿಸಿ.` : `Date set to ${dt}. Please describe the damage.`);
      setStepIndex(4);
    } else if (currentStep.id === "description") {
      setCollected((prev) => ({ ...prev, description: text }));
      speak(lang === "kn" ? "ಧನ್ಯವಾದಗಳು! ಎಲ್ಲಾ ವಿವರಗಳನ್ನು ಸಂಗ್ರಹಿಸಲಾಗಿದೆ. ದಯವಿಟ್ಟು ಪರಿಶೀಲಿಸಿ." : "Thank you! All details collected. Please review your claim.");
      setStepIndex(5);
    }
  };

  // Auto-speak question when step changes
  useEffect(() => {
    if (isOpen && stepIndex < steps.length) {
      const prompt = lang === "kn" ? steps[stepIndex].titleKn : steps[stepIndex].titleEn;
      speak(prompt);
    }
  }, [stepIndex, isOpen, lang]);

  if (!isOpen) return null;

  const handleApply = () => {
    onComplete({
      field_id: collected.field_id,
      crop_name: collected.crop_name,
      disaster_type: collected.disaster_type,
      incident_date: collected.incident_date,
      description: collected.description,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-sage-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-forest text-white shadow-soft">
              <Sparkles className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-forest-deep">
                {lang === "kn" ? "ಕಿಸಾನ್ ವಾಣಿ (ಧ್ವನಿ ಸಹಾಯಕ)" : "Kisan Vaani (Voice Filing)"}
              </h2>
              <p className="text-xs text-muted">
                {lang === "kn" ? "ಮಾತನಾಡುವ ಮೂಲಕ ನಿಮ್ಮ ಬೆಳೆ ನಷ್ಟದ ಕ್ಲೈಮ್ ದಾಖಲಿಸಿ" : "Speak naturally to file your crop damage claim"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLang(lang === "kn" ? "en" : "kn")}
              className="rounded-lg border border-sage-200 px-2.5 py-1 text-xs font-semibold text-forest hover:bg-sage-50"
            >
              {lang === "kn" ? "English" : "ಕನ್ನಡ"}
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted hover:bg-sage-100"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 flex gap-1">
          {steps.map((s, idx) => (
            <div
              key={s.id}
              className={`h-1.5 flex-1 rounded-full transition-all ${
                idx === stepIndex
                  ? "bg-forest"
                  : idx < stepIndex
                  ? "bg-forest/50"
                  : "bg-sage-200"
              }`}
            />
          ))}
        </div>

        {/* Main Interactive Stage */}
        <div className="my-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Step {stepIndex + 1} of {steps.length}
          </p>
          <h3 className="mt-2 text-xl font-extrabold text-navy">
            {lang === "kn" ? currentStep.titleKn : currentStep.titleEn}
          </h3>
          <p className="mt-1 text-xs text-forest">
            {lang === "kn" ? currentStep.hintKn : currentStep.hintEn}
          </p>

          {/* Voice Microphone Interaction Bubble */}
          <div className="mt-6 flex flex-col items-center justify-center">
            <div className="relative">
              {isListening && (
                <div className="absolute inset-0 -m-4 animate-ping rounded-full bg-forest/20" />
              )}
              {isSpeaking && (
                <div className="absolute inset-0 -m-2 animate-pulse rounded-full bg-gold/30" />
              )}
              <button
                type="button"
                onClick={isListening ? stopListening : startListening}
                className={`relative flex h-20 w-20 items-center justify-center rounded-full text-white shadow-lg transition-transform active:scale-95 ${
                  isListening
                    ? "bg-red-500 hover:bg-red-600"
                    : isSpeaking
                    ? "bg-gold text-navy hover:bg-amber-400"
                    : "bg-forest hover:bg-forest-deep"
                }`}
                title="Tap to speak"
              >
                {isListening ? (
                  <MicOff className="h-8 w-8 animate-bounce" />
                ) : isSpeaking ? (
                  <Volume2 className="h-8 w-8" />
                ) : (
                  <Mic className="h-8 w-8" />
                )}
              </button>
            </div>

            <p className="mt-3 text-xs font-semibold text-muted">
              {isListening
                ? lang === "kn" ? "ಆಲಿಸುತ್ತಿದೆ... ಈಗ ಮಾತನಾಡಿ" : "Listening... speak now"
                : isSpeaking
                ? lang === "kn" ? "ಕಿಸಾನ್ ವಾಣಿ ಮಾತನಾಡುತ್ತಿದೆ..." : "Kisan Vaani is speaking..."
                : lang === "kn" ? "ಮಾತನಾಡಲು ಮೈಕ್ರೋಫೋನ್ ಒತ್ತಿರಿ" : "Tap microphone to speak"}
            </p>

            {transcript && (
              <div className="mt-3 max-w-sm rounded-lg bg-sage-50 px-3 py-1.5 text-xs text-forest-deep border border-sage-200">
                "{transcript}"
              </div>
            )}

            {feedback && (
              <p className="mt-2 text-xs text-amber-700 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> {feedback}
              </p>
            )}
          </div>
        </div>

        {/* Live Collected Summary & Editable fallback */}
        <div className="rounded-xl border border-sage-200 bg-sage-50/60 p-3.5 text-xs">
          <p className="font-bold text-forest mb-2">
            {lang === "kn" ? "ದಾಖಲಾದ ಮಾಹಿತಿ (Captured Information):" : "Captured Information:"}
          </p>
          <div className="grid grid-cols-2 gap-2 text-muted">
            <div>
              <span className="font-medium text-navy">{lang === "kn" ? "ಹೊಲ: " : "Field: "}</span>
              <span className="font-bold text-forest">{collected.field_name || "Not selected"}</span>
            </div>
            <div>
              <span className="font-medium text-navy">{lang === "kn" ? "ಬೆಳೆ: " : "Crop: "}</span>
              <span className="font-bold text-forest">{collected.crop_name}</span>
            </div>
            <div>
              <span className="font-medium text-navy">{lang === "kn" ? "ವಿಕೋಪ: " : "Disaster: "}</span>
              <span className="font-bold text-forest capitalize">{collected.disaster_type}</span>
            </div>
            <div>
              <span className="font-medium text-navy">{lang === "kn" ? "ದಿನಾಂಕ: " : "Date: "}</span>
              <span className="font-bold text-forest">{collected.incident_date}</span>
            </div>
          </div>
          {collected.description && (
            <div className="mt-2 border-t border-sage-200 pt-1.5">
              <span className="font-medium text-navy">{lang === "kn" ? "ವಿವರಣೆ: " : "Notes: "}</span>
              <span className="text-forest">{collected.description}</span>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="mt-5 flex items-center justify-between gap-3 border-t border-sage-100 pt-4">
          <button
            type="button"
            onClick={() => setStepIndex((p) => Math.max(0, p - 1))}
            disabled={stepIndex === 0}
            className="rounded-lg border border-sage-200 px-3 py-2 text-xs font-semibold text-muted hover:bg-sage-50 disabled:opacity-30"
          >
            {lang === "kn" ? "ಹಿಂದೆ" : "Previous"}
          </button>

          {stepIndex < steps.length - 1 ? (
            <button
              type="button"
              onClick={() => setStepIndex((p) => Math.min(steps.length - 1, p + 1))}
              className="btn btn-primary !min-h-[38px] !px-4 text-xs font-bold flex items-center gap-1.5"
            >
              <span>{lang === "kn" ? "ಮುಂದೆ" : "Next Step"}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleApply}
              className="btn !min-h-[38px] !px-5 text-xs font-bold bg-gold text-navy hover:bg-amber-400 flex items-center gap-1.5 shadow-md"
            >
              <Check className="h-4 w-4" />
              <span>{lang === "kn" ? "ಫಾರ್ಮ್‌ಗೆ ಅನ್ವಯಿಸಿ (Apply to Claim)" : "Apply to Claim Form"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
