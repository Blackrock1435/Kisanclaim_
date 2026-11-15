import React, { useState } from "react";
import { Bot, Send, Sparkles, CheckCircle2, MessageSquare, CornerDownRight, ShieldCheck } from "lucide-react";
import { api } from "../lib/api";
import { Spinner } from "./ui";

interface Props {
  claimId: number;
  claimRef?: string;
  farmerName?: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  groundedFacts?: string[];
}

export const AICopilotChat: React.FC<Props> = ({ claimId, claimRef = "KC-2026-000101", farmerName = "Ramesh Kumar" }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `Hello Officer. I am your AI Claim Intelligence Copilot for claim **${claimRef}** (Farmer: ${farmerName}). I am grounded directly in this claim's Sentinel-2 NDVI telemetry, Open-Meteo rainfall records, Bhoomi cadastral records, and photographic EXIF sensors. How can I assist your review?`,
      groundedFacts: [
        "Copernicus Sentinel-2 L2A Multispectral Bands",
        "Open-Meteo ERA5 Reanalysis Meteorological Anomaly",
        "India Post 10-Character DIGIPIN & Bhoomi Karnataka RTC",
      ],
    },
  ]);

  const [input, setInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const suggestedQuestions = [
    "Why is this claim considered high priority?",
    "Explain the NDVI difference and satellite evidence.",
    "Is the rainfall consistent with the reported flood?",
    "What are the possible inconsistencies or fraud risks?",
    "How was the indicative claim payout calculated?",
  ];

  const handleSend = async (queryText?: string) => {
    const text = queryText || input;
    if (!text.trim() || loading) return;

    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const resp = await api<{ answer: string; grounded_facts: string[]; suggested_questions: string[] }>("/copilot/chat", {
        method: "POST",
        body: { claim_id: claimId, question: text },
      });
      const botMsg: Message = {
        role: "assistant",
        content: resp.answer,
        groundedFacts: resp.grounded_facts,
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Apologies, unable to process the copilot inquiry: ${err.message || "Network error"}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-700 flex flex-col h-[520px] shadow-2xl overflow-hidden text-slate-100">
      {/* Header */}
      <div className="p-3.5 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-cyan-500/20 text-cyan-400 rounded-xl border border-cyan-500/30">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              AI Reviewer Copilot
              <span className="text-[10px] bg-cyan-500/20 text-cyan-300 font-mono px-2 py-0.5 rounded-full border border-cyan-500/30">
                GROUNDED IN CLAIM DATA
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">Context: {claimRef} • {farmerName}</p>
          </div>
        </div>
      </div>

      {/* Suggested Quick Inquiries */}
      <div className="p-2.5 bg-slate-950/70 border-b border-slate-800/80 overflow-x-auto flex items-center gap-2 text-xs">
        <span className="text-[10px] text-slate-400 font-bold uppercase whitespace-nowrap pl-1">Ask:</span>
        {suggestedQuestions.slice(0, 3).map((sq, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSend(sq)}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg whitespace-nowrap text-[11px] transition border border-slate-700/60"
          >
            {sq}
          </button>
        ))}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, idx) => (
          <div key={idx} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                m.role === "user"
                  ? "bg-forest text-white shadow-md rounded-br-none"
                  : "bg-slate-800 text-slate-200 border border-slate-700/80 rounded-bl-none shadow-md"
              }`}
            >
              {/* Message text with basic markdown formatting */}
              <div className="space-y-2 whitespace-pre-wrap">
                {m.content}
              </div>

              {/* Grounded Evidence Citations */}
              {m.groundedFacts && m.groundedFacts.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-slate-700/70 space-y-1">
                  <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Grounded Evidentiary Telemetry:
                  </p>
                  <ul className="text-[10px] text-slate-300 space-y-0.5 list-disc pl-3">
                    {m.groundedFacts.slice(0, 4).map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-3 text-xs flex items-center gap-2 text-cyan-400">
              <Spinner />
              <span>Copilot is querying Sentinel-2, Open-Meteo and DIGIPIN telemetry...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-3 bg-slate-850 border-t border-slate-800 flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask copilot about NDVI, rainfall, fraud signals, scale of finance..."
          className="flex-1 bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-cyan-500"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="btn bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white !min-h-[38px] px-3.5 rounded-xl flex items-center justify-center font-bold text-xs"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
export default AICopilotChat;
