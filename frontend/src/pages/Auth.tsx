import { useState, useRef, useEffect } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mic, MicOff, Volume2, Sparkles, CheckCircle2, Phone, KeyRound, User as UserIcon, ArrowRight } from "lucide-react";
import { Alert, FieldWrap, Input, Spinner } from "../components/ui";
import { useAuth } from "../lib/auth";
import Logo from "../components/Logo";
import {
  playChime,
  speakAloud,
  stopSpeaking,
  primeSpeechSynthesis,
  isSpeechRecognitionSupported,
  cleanSpokenName,
  spokenToDigits,
  startFieldVoiceRecognition,
} from "../lib/speech";

function Shell({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  const { i18n } = useTranslation();
  const isKn = i18n.language === "kn";
  return (
    <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-5xl items-center gap-10 px-4 py-8 md:grid-cols-2">
      <div className="hidden md:block">
        <Logo />
        <h1 className="mt-6 text-4xl font-extrabold text-forest-deep">{title}</h1>
        <p className="mt-3 text-navy/75 text-base">{sub}</p>
        <div className="mt-8 rounded-2xl bg-sage-50 border border-sage-200 p-5 space-y-3">
          <p className="font-bold text-forest text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> {isKn ? "ಸುಲಭ ರೈತ ದೃಢೀಕರಣ (Easy Farmer Access)" : "Easy Farmer Access"}
          </p>
          <p className="text-xs text-muted">
            {isKn
              ? "ರೈತರಿಗೆ ಯಾವುದೇ ಇಮೇಲ್ ಅಥವಾ ಪಾಸ್‌ವರ್ಡ್ ಅಗತ್ಯವಿಲ್ಲ. ನಿಮ್ಮ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ ಮತ್ತು OTP ನಮೂದಿಸಿ ಅಥವಾ ಧ್ವನಿ ಮೂಲಕ ಸುಲಭವಾಗಿ ಪ್ರವೇಶಿಸಿ."
              : "No password or email required for farmers. Simply enter your mobile number and OTP, or log in easily with voice guidance."}
          </p>
        </div>
      </div>
      <div className="card p-6 sm:p-8">
        <div className="mb-5 md:hidden">
          <h1 className="text-2xl font-extrabold text-forest-deep">{title}</h1>
          <p className="mt-1 text-sm text-muted">{sub}</p>
        </div>
        {children}
      </div>
    </div>
  );
}

/* =========================================================================
   1. FARMER LOGIN & REGISTRATION (Name + Mobile + OTP + Side-by-Side Voice Controls)
   ========================================================================= */
export function FarmerAuth() {
  const { sendOtp, loginWithOtp, user } = useAuth();
  const nav = useNavigate();
  const from = (useLocation().state as any)?.from || "/app";
  const { i18n } = useTranslation();
  const isKn = i18n.language === "kn";

  const [step, setStep] = useState<"phone_and_name" | "otp">("phone_and_name");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [devOtpCode, setDevOtpCode] = useState("");
  const [isRegistered, setIsRegistered] = useState(true);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");

  // Voice Assistant State
  const [activeField, setActiveField] = useState<"name" | "phone" | "otp" | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("");
  const [voiceLang, setVoiceLang] = useState<"kn" | "en">(isKn ? "kn" : "en");
  const [audioLevel, setAudioLevel] = useState<number>(0);

  const voiceControllerRef = useRef<any>(null);

  // Sync voiceLang when i18n language changes
  useEffect(() => {
    setVoiceLang(isKn ? "kn" : "en");
  }, [isKn]);

  // Cleanup speech resources on unmount
  useEffect(() => {
    return () => {
      stopVoice();
    };
  }, []);

  if (user) return <Navigate to="/app" replace />;

  const stopVoice = () => {
    stopSpeaking();
    if (voiceControllerRef.current) {
      try {
        voiceControllerRef.current.stop();
      } catch {}
      voiceControllerRef.current = null;
    }
    setActiveField(null);
    setIsListening(false);
    setAudioLevel(0);
    setVoiceStatus("");
  };

  const toggleFieldVoice = (field: "name" | "phone" | "otp") => {
    setErr("");
    if (activeField === field) {
      stopVoice();
      return;
    }

    stopVoice();
    primeSpeechSynthesis();

    if (!isSpeechRecognitionSupported()) {
      setErr(
        isKn
          ? "ನಿಮ್ಮ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಧ್ವನಿ ಗ್ರಹಿಕೆ ಬೆಂಬಲಿತವಾಗಿಲ್ಲ. ದಯವಿಟ್ಟು ನೇರವಾಗಿ ಟೈಪ್ ಮಾಡಿ."
          : "Speech recognition not supported in this browser. Please type manually."
      );
      return;
    }

    setActiveField(field);

    let promptText = "";
    if (field === "name") {
      promptText = isKn ? "ದಯವಿಟ್ಟು ನಿಮ್ಮ ಪೂರ್ಣ ಹೆಸರನ್ನು ಹೇಳಿ." : "Please speak your full name.";
    } else if (field === "phone") {
      promptText = isKn ? "ನಿಮ್ಮ 10 ಅಂಕಿಗಳ ಮೊಬೈಲ್ ಸಂಖ್ಯೆಯನ್ನು ಹೇಳಿ." : "Please speak your 10-digit mobile number.";
    } else if (field === "otp") {
      promptText = isKn ? "ನಿಮ್ಮ 6 ಅಂಕಿಗಳ OTP ಯನ್ನು ಹೇಳಿ." : "Please speak your 6-digit verification code.";
    }

    setVoiceStatus(promptText);

    speakAloud(promptText, {
      lang: isKn ? "kn-IN" : "en-IN",
      onEnd: () => {
        const ctrl = startFieldVoiceRecognition({
          lang: isKn ? "kn-IN" : "en-IN",
          onStart: () => {
            setIsListening(true);
            setVoiceStatus(isKn ? "ಆಲಿಸುತ್ತಿದೆ... ಮಾತನಾಡಿ" : "Listening... speak now");
          },
          onAudioLevel: (lvl) => setAudioLevel(lvl),
          onInterimText: (txt) => {
            if (field === "name") {
              const cleaned = cleanSpokenName(txt);
              if (cleaned) setName(cleaned);
            } else if (field === "phone") {
              const d = spokenToDigits(txt).slice(-10);
              if (d) setPhone(d);
            } else if (field === "otp") {
              const d = spokenToDigits(txt).slice(0, 6);
              if (d) setOtp(d);
            }
          },
          onFinalText: (txt) => {
            playChime("success");
            if (field === "name") {
              const cleaned = cleanSpokenName(txt);
              if (cleaned) {
                setName(cleaned);
                setVoiceStatus(isKn ? `ಹೆಸರು: ${cleaned}` : `Name: ${cleaned}`);
              }
            } else if (field === "phone") {
              const d = spokenToDigits(txt).slice(-10);
              if (d) {
                setPhone(d);
                setVoiceStatus(isKn ? `ಮೊಬೈಲ್: ${d}` : `Phone: ${d}`);
              }
            } else if (field === "otp") {
              const d = spokenToDigits(txt).slice(0, 6);
              if (d) {
                setOtp(d);
                setVoiceStatus(`OTP: ${d}`);
              }
            }
            setTimeout(() => stopVoice(), 600);
          },
          onError: () => {
            setIsListening(false);
            setActiveField(null);
            setAudioLevel(0);
          },
          onEnd: () => {
            setIsListening(false);
            setActiveField(null);
            setAudioLevel(0);
          },
        });
        voiceControllerRef.current = ctrl;
      },
    });
  };

  // Master Voice Guided Login sequence
  const startGuidedVoice = () => {
    if (activeField) {
      stopVoice();
      return;
    }
    if (!name.trim()) {
      toggleFieldVoice("name");
    } else if (phone.length < 10) {
      toggleFieldVoice("phone");
    } else if (step === "otp") {
      toggleFieldVoice("otp");
    } else {
      triggerSendOtp(phone);
    }
  };

  const triggerSendOtp = async (targetPhone: string) => {
    setErr("");
    setInfo("");
    setLoading(true);
    try {
      const res = await sendOtp(targetPhone);
      setStep("otp");
      setIsRegistered(res.is_registered);
      if (res.name && !name) setName(res.name);
      setInfo(res.message);
      const code = res.dev_otp || res.otp || "123456";
      setDevOtpCode(code);
      setOtp(code);
    } catch (e: any) {
      setErr(e.message || (isKn ? "OTP ಕಳುಹಿಸಲು ವಿಫಲವಾಗಿದೆ" : "Failed to send OTP"));
    } finally {
      setLoading(false);
    }
  };

  const triggerVerifyOtp = async (targetOtp: string) => {
    setErr("");
    setLoading(true);
    try {
      await loginWithOtp(phone, targetOtp, name.trim() || undefined);
      nav(from, { replace: true });
    } catch (e: any) {
      setErr(e.message || (isKn ? "ತಪ್ಪಾದ OTP" : "Invalid OTP code"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Shell
      title={isKn ? "ರೈತರ ಲಾಗಿನ್ & ನೋಂದಣಿ" : "Farmer Login & Registration"}
      sub={
        isKn
          ? "ಹೆಸರು, ಮೊಬೈಲ್ ಸಂಖ್ಯೆ ಮತ್ತು OTP ನಮೂದಿಸಿ. ಧ್ವನಿ ಮೂಲಕ ತುಂಬಿ ಅಥವಾ ನೇರವಾಗಿ ಟೈಪ್ ಮಾಡಿ."
          : "Enter your name, mobile number and OTP. Use voice assistant or type directly."
      }
    >
      <div className="space-y-5">
        {/* Voice Assistant Master Control Banner */}
        <div className="rounded-2xl border-2 border-forest/30 bg-sage-50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-full text-white shadow-soft transition-colors ${
                  isListening ? "bg-red-500 animate-pulse" : "bg-forest"
                }`}
              >
                {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </span>
              <div>
                <p className="font-display font-bold text-forest-deep text-sm">
                  {isKn ? "ಕಿಸಾನ್ ಧ್ವನಿ ಸಹಾಯಕ (Voice Assistant)" : "Kisan Voice Assistant"}
                </p>
                <p className="text-[11px] text-muted">
                  {isKn
                    ? "ಪ್ರತಿ ಕಾಲಂ ಪಕ್ಕದಲ್ಲಿರುವ ಧ್ವನಿ ಬಟನ್ ಬಳಸಿ ಅಥವಾ ನೇರವಾಗಿ ಟೈಪ್ ಮಾಡಿ"
                    : "Use mic beside any field to speak, or type manually"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                stopVoice();
                const nextLang = isKn ? "en" : "kn";
                i18n.changeLanguage(nextLang);
                setVoiceLang(nextLang);
              }}
              className="rounded-lg border border-sage-300 bg-white px-2.5 py-1 text-xs font-semibold text-forest hover:bg-sage-100"
            >
              {isKn ? "Switch to English" : "ಕನ್ನಡಕ್ಕೆ ಬದಲಿಸಿ"}
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={startGuidedVoice}
              className={`btn flex-1 !min-h-[42px] font-bold text-xs shadow-soft flex items-center justify-center gap-2 transition-all ${
                isListening ? "bg-red-500 text-white animate-pulse" : "bg-gold text-navy hover:bg-amber-400"
              }`}
            >
              {isListening ? (
                <>
                  <MicOff className="h-4 w-4" />
                  <span>{isKn ? "ಧ್ವನಿ ಆಫ್ ಮಾಡಿ (Stop Listening)" : "Stop Voice Assistant"}</span>
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4" />
                  <span>{isKn ? "ಧ್ವನಿ ಮೂಲಕ ಲಾಗಿನ್ ಪ್ರಾರಂಭಿಸಿ" : "Start Guided Voice Login"}</span>
                </>
              )}
            </button>
          </div>

          {voiceStatus && (
            <p className="mt-2 text-center text-xs font-medium text-forest-deep bg-white/80 rounded p-1.5 border border-sage-200">
              "{voiceStatus}"
            </p>
          )}
        </div>

        {err && <Alert tone="error">{err}</Alert>}
        {info && <Alert tone="info">{info}</Alert>}

        {/* Farmer Authentication Form */}
        {step === "phone_and_name" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (phone.length < 10) {
                setErr(
                  isKn
                    ? "ದಯವಿಟ್ಟು ಸರಿಯಾದ 10 ಅಂಕಿಗಳ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ ನಮೂದಿಸಿ"
                    : "Please enter a valid 10-digit mobile number"
                );
                return;
              }
              triggerSendOtp(phone);
            }}
            className="space-y-4"
          >
            {/* Field 1: Farmer Name with Side-by-Side Voice Button */}
            <FieldWrap label={isKn ? "ರೈತರ ಹೆಸರು (Farmer Name)" : "Farmer Full Name"} htmlFor="farmer-name">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-3 text-muted">
                    <UserIcon className="h-5 w-5" />
                  </span>
                  <Input
                    id="farmer-name"
                    type="text"
                    className={`pl-10 text-base font-semibold transition-all ${
                      activeField === "name" ? "border-red-500 ring-2 ring-red-200 bg-red-50/20" : ""
                    }`}
                    placeholder={isKn ? "ಉದಾ: ರಮೇಶ್ ಕುಮಾರ್" : "e.g. Ramesh Kumar"}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => toggleFieldVoice("name")}
                  className={`btn text-xs font-bold !min-h-[42px] px-3 flex items-center gap-1.5 whitespace-nowrap transition-all shadow-sm ${
                    activeField === "name"
                      ? "bg-red-500 hover:bg-red-600 text-white animate-pulse"
                      : "bg-sage-100 hover:bg-sage-200 text-forest border border-sage-300"
                  }`}
                  title={
                    activeField === "name"
                      ? isKn ? "ಧ್ವನಿ ಆಫ್ ಮಾಡಿ" : "Stop Voice"
                      : isKn ? "ಧ್ವನಿ ಮೂಲಕ ಹೆಸರು ತುಂಬಿ" : "Voice Fill Name"
                  }
                >
                  {activeField === "name" ? (
                    <div className="flex items-center gap-1.5">
                      <MicOff className="h-4 w-4" />
                      <span className="flex items-end gap-0.5 h-3.5 mx-0.5">
                        <span
                          className="w-0.5 bg-white rounded-full transition-all duration-75"
                          style={{ height: `${Math.max(4, audioLevel * 0.15)}px` }}
                        />
                        <span
                          className="w-0.5 bg-white rounded-full transition-all duration-75"
                          style={{ height: `${Math.max(6, audioLevel * 0.22)}px` }}
                        />
                        <span
                          className="w-0.5 bg-white rounded-full transition-all duration-75"
                          style={{ height: `${Math.max(4, audioLevel * 0.13)}px` }}
                        />
                      </span>
                      <span>{isKn ? "ಧ್ವನಿ ಆಫ್" : "Stop"}</span>
                    </div>
                  ) : (
                    <>
                      <Mic className="h-4 w-4 text-forest" />
                      <span>{isKn ? "ಧ್ವನಿ ಆನ್" : "Voice"}</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-[11px] text-muted mt-1">
                {isKn
                  ? "ಧ್ವನಿ ಆನ್ ಮಾಡಿ ಹೆಸರನ್ನು ಹೇಳಿ ಅಥವಾ ಕೀಬೋರ್ಡ್ ಮೂಲಕ ನೇರವಾಗಿ ಟೈಪ್ ಮಾಡಿ."
                  : "Click Voice button and speak your full name, or type directly."}
              </p>
            </FieldWrap>

            {/* Field 2: Mobile Number with Side-by-Side Voice Button */}
            <FieldWrap label={isKn ? "ಮೊಬೈಲ್ ಸಂಖ್ಯೆ (Mobile Number)" : "Mobile Number"} htmlFor="farmer-phone">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-3 text-muted font-bold text-sm">+91</span>
                  <Input
                    id="farmer-phone"
                    type="tel"
                    maxLength={10}
                    className={`pl-12 text-lg font-mono font-bold tracking-wider transition-all ${
                      activeField === "phone" ? "border-red-500 ring-2 ring-red-200 bg-red-50/20" : ""
                    }`}
                    placeholder="9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => toggleFieldVoice("phone")}
                  className={`btn text-xs font-bold !min-h-[42px] px-3 flex items-center gap-1.5 whitespace-nowrap transition-all shadow-sm ${
                    activeField === "phone"
                      ? "bg-red-500 hover:bg-red-600 text-white animate-pulse"
                      : "bg-sage-100 hover:bg-sage-200 text-forest border border-sage-300"
                  }`}
                  title={
                    activeField === "phone"
                      ? isKn ? "ಧ್ವನಿ ಆಫ್ ಮಾಡಿ" : "Stop Voice"
                      : isKn ? "ಧ್ವನಿ ಮೂಲಕ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ ತುಂಬಿ" : "Voice Fill Phone"
                  }
                >
                  {activeField === "phone" ? (
                    <div className="flex items-center gap-1.5">
                      <MicOff className="h-4 w-4" />
                      <span className="flex items-end gap-0.5 h-3.5 mx-0.5">
                        <span
                          className="w-0.5 bg-white rounded-full transition-all duration-75"
                          style={{ height: `${Math.max(4, audioLevel * 0.15)}px` }}
                        />
                        <span
                          className="w-0.5 bg-white rounded-full transition-all duration-75"
                          style={{ height: `${Math.max(6, audioLevel * 0.22)}px` }}
                        />
                        <span
                          className="w-0.5 bg-white rounded-full transition-all duration-75"
                          style={{ height: `${Math.max(4, audioLevel * 0.13)}px` }}
                        />
                      </span>
                      <span>{isKn ? "ಧ್ವನಿ ಆಫ್" : "Stop"}</span>
                    </div>
                  ) : (
                    <>
                      <Mic className="h-4 w-4 text-forest" />
                      <span>{isKn ? "ಧ್ವನಿ ಆನ್" : "Voice"}</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-[11px] text-muted mt-1">
                {isKn
                  ? "ಧ್ವನಿ ಆನ್ ಮಾಡಿ 10 ಅಂಕಿಗಳ ಸಂಖ್ಯೆ ಹೇಳಿ ಅಥವಾ ಕೀಬೋರ್ಡ್ ಮೂಲಕ ನೇರವಾಗಿ ಟೈಪ್ ಮಾಡಿ."
                  : "Click Voice button and say your 10-digit number, or type directly."}
              </p>
            </FieldWrap>

            {/* Quick Demo Farmer Button */}
            <div className="rounded-lg bg-sage-50 p-2.5 text-xs border border-sage-200">
              <p className="font-bold text-forest mb-1">
                {isKn ? "ಡೆಮೊ ರೈತ ಖಾತೆ (One-Click Demo Farmer):" : "One-Click Demo Farmer Account:"}
              </p>
              <button
                type="button"
                onClick={() => {
                  setName("Ramesh Kumar");
                  setPhone("9876543210");
                  triggerSendOtp("9876543210");
                }}
                className="w-full rounded bg-white px-3 py-1.5 font-bold text-navy border border-sage-300 hover:bg-sage-100 flex items-center justify-between"
              >
                <span>Ramesh Kumar (9876543210)</span>
                <span className="text-forest text-[11px]">
                  {isKn ? "ಸ್ವಯಂ ತುಂಬಿ & OTP ಕಳುಹಿಸಿ →" : "Auto Fill & Send OTP →"}
                </span>
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || phone.length < 10}
              className="btn btn-primary w-full !min-h-[44px] text-sm font-bold flex items-center justify-center gap-2"
            >
              {loading ? (
                <Spinner />
              ) : (
                <>
                  <span>{isKn ? "OTP ಕಳುಹಿಸಿ (Send OTP)" : "Send Verification OTP"}</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (otp.length < 4) {
                setErr(isKn ? "ದಯವಿಟ್ಟು OTP ನಮೂದಿಸಿ" : "Please enter the verification code");
                return;
              }
              triggerVerifyOtp(otp);
            }}
            className="space-y-4"
          >
            {/* Farmer Info Summary Pill with Edit Option */}
            <div className="rounded-xl bg-sage-50 border border-sage-200 p-3 flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-forest-deep">{name || (isKn ? "ರೈತ" : "Farmer")}</p>
                <p className="text-muted">+91 {phone}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  stopVoice();
                  setStep("phone_and_name");
                }}
                className="font-bold text-forest underline hover:text-forest-deep text-xs"
              >
                {isKn ? "ಬದಲಾಯಿಸಿ (Edit)" : "Change"}
              </button>
            </div>

            {/* Field 3: OTP with Side-by-Side Voice Button */}
            <FieldWrap label={isKn ? "6 ಅಂಕಿಗಳ OTP (6-Digit OTP)" : "6-Digit OTP"} htmlFor="farmer-otp">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-3 text-muted">
                    <KeyRound className="h-5 w-5" />
                  </span>
                  <Input
                    id="farmer-otp"
                    type="text"
                    maxLength={6}
                    className={`pl-10 text-center text-xl font-mono font-black tracking-widest text-forest-deep transition-all ${
                      activeField === "otp" ? "border-red-500 ring-2 ring-red-200 bg-red-50/20" : ""
                    }`}
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => toggleFieldVoice("otp")}
                  className={`btn text-xs font-bold !min-h-[42px] px-3 flex items-center gap-1.5 whitespace-nowrap transition-all shadow-sm ${
                    activeField === "otp"
                      ? "bg-red-500 hover:bg-red-600 text-white animate-pulse"
                      : "bg-sage-100 hover:bg-sage-200 text-forest border border-sage-300"
                  }`}
                  title={
                    activeField === "otp"
                      ? isKn ? "ಧ್ವನಿ ಆಫ್ ಮಾಡಿ" : "Stop Voice"
                      : isKn ? "ಧ್ವನಿ ಮೂಲಕ OTP ತುಂಬಿ" : "Voice Fill OTP"
                  }
                >
                  {activeField === "otp" ? (
                    <div className="flex items-center gap-1.5">
                      <MicOff className="h-4 w-4" />
                      <span className="flex items-end gap-0.5 h-3.5 mx-0.5">
                        <span
                          className="w-0.5 bg-white rounded-full transition-all duration-75"
                          style={{ height: `${Math.max(4, audioLevel * 0.15)}px` }}
                        />
                        <span
                          className="w-0.5 bg-white rounded-full transition-all duration-75"
                          style={{ height: `${Math.max(6, audioLevel * 0.22)}px` }}
                        />
                        <span
                          className="w-0.5 bg-white rounded-full transition-all duration-75"
                          style={{ height: `${Math.max(4, audioLevel * 0.13)}px` }}
                        />
                      </span>
                      <span>{isKn ? "ಧ್ವನಿ ಆಫ್" : "Stop"}</span>
                    </div>
                  ) : (
                    <>
                      <Mic className="h-4 w-4 text-forest" />
                      <span>{isKn ? "ಧ್ವನಿ ಆನ್" : "Voice"}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Dev OTP Display & Auto-Fill */}
              <div className="mt-2 flex items-center justify-between rounded-lg bg-sage-50 px-3 py-1.5 text-xs border border-sage-200">
                <span className="text-muted">
                  {isKn ? "ಪರೀಕ್ಷಾರ್ಥ OTP: " : "Test Mode OTP: "}
                  <strong className="text-forest font-mono text-sm tracking-wider">
                    {devOtpCode || "123456"}
                  </strong>
                </span>
                <button
                  type="button"
                  onClick={() => setOtp(devOtpCode || "123456")}
                  className="font-bold text-forest underline hover:text-forest-deep"
                >
                  {isKn ? "ಸ್ವಯಂ ಭರ್ತಿ ಮಾಡಿ" : "Auto-Fill OTP"}
                </button>
              </div>
            </FieldWrap>

            <button
              type="submit"
              disabled={loading || otp.length < 4}
              className="btn btn-primary w-full !min-h-[44px] text-sm font-bold flex items-center justify-center gap-2"
            >
              {loading ? (
                <Spinner />
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{isKn ? "ದೃಢೀಕರಿಸಿ & ಲಾಗಿನ್ ಮಾಡಿ" : "Verify & Sign In"}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => triggerSendOtp(phone)}
              disabled={loading}
              className="w-full text-center text-xs font-bold text-forest hover:underline"
            >
              {isKn ? "OTP ಮರುಕಳುಹಿಸಿ (Resend OTP)" : "Resend Verification OTP"}
            </button>
          </form>
        )}

        <div className="border-t border-sage-100 pt-3 text-center">
          <Link to="/officer-login" className="text-xs font-semibold text-forest hover:underline">
            {isKn
              ? "ಕೃಷಿ ಅಧಿಕಾರಿ / ವಿಮಾ ಕಂಪನಿ ಲಾಗಿನ್ (Officer Portal) →"
              : "Agricultural Officer & Insurer Sign In →"}
          </Link>
        </div>
      </div>
    </Shell>
  );
}

/* =========================================================================
   2. OFFICER & INSURER LOGIN (Email + Password)
   ========================================================================= */
const officerLoginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

export function OfficerLogin() {
  const { login, user } = useAuth();
  const nav = useNavigate();
  const from = (useLocation().state as any)?.from || "/app";
  const [err, setErr] = useState("");
  const { register, setValue, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(officerLoginSchema),
  });

  if (user) return <Navigate to="/app" replace />;

  const onSubmit = async (vals: any) => {
    setErr("");
    try {
      await login(vals.email, vals.password);
      nav(from, { replace: true });
    } catch (e: any) {
      setErr(e.message || "Sign in failed");
    }
  };

  return (
    <Shell
      title="Officer & Insurer Sign In"
      sub="For authorised agriculture officers, insurer underwriters and administrators."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {err && <Alert tone="error">{err}</Alert>}
        
        <FieldWrap label="Email" error={errors.email?.message as string} htmlFor="email">
          <Input id="email" type="email" autoComplete="email" {...register("email")} />
        </FieldWrap>
        
        <FieldWrap label="Password" error={errors.password?.message as string} htmlFor="password">
          <Input id="password" type="password" autoComplete="current-password" {...register("password")} />
        </FieldWrap>

        <div className="rounded-lg bg-sage-50 p-2.5 text-xs border border-sage-200 space-y-1.5">
          <p className="font-bold text-forest">One-Click Demo Accounts (Password: Password@123):</p>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => {
                setValue("email", "officer@kisanclaim.in");
                setValue("password", "Password@123");
              }}
              className="rounded bg-white px-2 py-1 font-semibold text-navy border border-sage-300 hover:bg-sage-100"
            >
              Fill Officer/Insurer
            </button>
            <button
              type="button"
              onClick={() => {
                setValue("email", "admin@kisanclaim.in");
                setValue("password", "Password@123");
              }}
              className="rounded bg-white px-2 py-1 font-semibold text-navy border border-sage-300 hover:bg-sage-100"
            >
              Fill Admin
            </button>
          </div>
        </div>

        <button className="btn btn-primary w-full" disabled={isSubmitting}>
          {isSubmitting ? <Spinner /> : "Log in"}
        </button>

        <div className="flex justify-between text-sm">
          <Link to="/forgot-password" className="font-semibold text-forest">Forgot password?</Link>
          <Link to="/login" className="font-semibold text-forest">Farmer mobile & voice login →</Link>
        </div>
      </form>
    </Shell>
  );
}

export function Forgot() {
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");
  return (
    <Shell title="Reset your password" sub="We will send a reset link to your registered email address.">
      {sent ? (
        <Alert tone="info">If that email address is registered, we have sent instructions to reset your password.</Alert>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); setSent(true); }} className="space-y-4">
          <FieldWrap label="Email address" htmlFor="forgot-email">
            <Input id="forgot-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </FieldWrap>
          <button className="btn btn-primary w-full">Send reset link</button>
          <div className="text-center text-sm">
            <Link to="/login" className="font-semibold text-forest">Back to sign in</Link>
          </div>
        </form>
      )}
    </Shell>
  );
}

export const Login = FarmerAuth;
export const Register = FarmerAuth;

