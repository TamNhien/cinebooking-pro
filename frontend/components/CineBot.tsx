/* eslint-disable react-hooks/set-state-in-effect -- restores a bounded, tab-local chat transcript after hydration. */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useLanguage } from "@/components/LanguageProvider";

type Role = "user" | "assistant";
type ChatLink = { label: string; href: string };
type ChatMessage = { id: number; role: Role; content: string; links?: ChatLink[]; mode?: "local" | "ai" };
type ChatResponse = { reply: string; links: ChatLink[]; suggestions: string[]; mode: "local" | "ai" };
const STORAGE = "cinebooking-cinebot-session-v1";
const MAX_MESSAGES = 24;
const MAX_TEXT = 500;
const SAFE_HREF = /^\/(?:movies(?:\/[0-9a-fA-F-]{36})?|cinemas|bookings|booking\/[0-9a-fA-F-]{36})$/;

export default function CineBot() {
  const { language } = useLanguage();
  const pathname = usePathname();
  const en = language === "en";
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const sequence = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const busyRef = useRef(false);
  const requestRef = useRef<AbortController | null>(null);
  const generationRef = useRef(0);

  const defaults = en
    ? ["Recommend a movie", "Today's showtimes", "How to book tickets?"]
    : ["Gợi ý phim hay", "Lịch chiếu hôm nay", "Hướng dẫn đặt vé"];
  const greeting = en
    ? "Hi there! 👋 I'm CineBot, your movie buddy. Want a recommendation, showtimes or help with booking?"
    : "Xin chào bạn! 👋 Mình là CineBot, trợ lý phim của CineBooking. Mình có thể tư vấn phim, tìm lịch chiếu, hướng dẫn đặt vé và trò chuyện cùng bạn nè!";

  useEffect(() => {
    try {
      const stored: unknown = JSON.parse(sessionStorage.getItem(STORAGE) || "null");
      if (!Array.isArray(stored)) return;
      const restored: ChatMessage[] = stored.slice(-MAX_MESSAGES).filter((item): item is ChatMessage =>
        !!item && typeof item.id === "number" && (item.role === "user" || item.role === "assistant") &&
        typeof item.content === "string" && item.content.length <= 1800,
      ).map(item => ({
        id: item.id, role: item.role, content: item.content,
        links: Array.isArray(item.links) ? item.links.filter(link =>
          link && typeof link.label === "string" && typeof link.href === "string" && SAFE_HREF.test(link.href),
        ).slice(0, 5) : [],
        mode: item.mode === "ai" ? "ai" : "local",
      }));
      if (restored.length) {
        setMessages(restored);
        sequence.current = Math.max(...restored.map(item => item.id));
      }
    } catch { /* No transcript is needed for a fresh visitor. */ }
  }, []);

  useEffect(() => {
    if (messages.length) {
      try { sessionStorage.setItem(STORAGE, JSON.stringify(messages.slice(-MAX_MESSAGES))); } catch {}
    }
  }, [messages]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    bottomRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [open, messages, pending]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); toggleRef.current?.focus(); }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => { window.removeEventListener("keydown", closeOnEscape); };
  }, [open]);

  const send = useCallback(async (raw: string) => {
    const content = raw.trim().slice(0, MAX_TEXT);
    if (!content || busyRef.current) return;
    busyRef.current = true;
    const generation = generationRef.current;
    const controller = new AbortController();
    requestRef.current = controller;
    const history = messages.slice(-8).map(item => ({ role: item.role, content: item.content.slice(0, 500) }));
    const nextId = ++sequence.current;
    setMessages(previous => [...previous, { id: nextId, role: "user" as const, content }].slice(-MAX_MESSAGES));
    setDraft("");
    setError("");
    setPending(true);
    try {
      const result = await api<ChatResponse>("/chatbot/message", {
        method: "POST",
        body: JSON.stringify({ message: content, language, history }),
        signal: controller.signal,
      });
      if (generation !== generationRef.current) return;
      const links = Array.isArray(result.links) ? result.links.filter(link =>
        link && typeof link.label === "string" && typeof link.href === "string" && SAFE_HREF.test(link.href),
      ).slice(0, 5) : [];
      setMessages(previous => [...previous, {
        id: ++sequence.current, role: "assistant" as const, content: result.reply, links,
        mode: result.mode === "ai" ? ("ai" as const) : ("local" as const),
      }].slice(-MAX_MESSAGES));
      if (Array.isArray(result.suggestions)) setSuggestions(result.suggestions.filter(item => typeof item === "string").slice(0, 3));
    } catch (cause) {
      if (generation !== generationRef.current) return;
      setError(cause instanceof ApiError && cause.status === 429
        ? (en ? "Too many messages. Please try again in a minute." : "Bạn nhắn hơi nhanh rồi. Vui lòng thử lại sau một phút nhé.")
        : (en ? "CineBot couldn't connect. Check the backend and try again." : "CineBot chưa kết nối được máy chủ. Bạn kiểm tra backend rồi thử lại nhé."));
    } finally {
      if (generation === generationRef.current) {
        requestRef.current = null;
        busyRef.current = false;
        setPending(false);
      }
    }
  }, [en, language, messages]);

  function clearChat() {
    generationRef.current += 1;
    requestRef.current?.abort();
    requestRef.current = null;
    busyRef.current = false;
    setPending(false);
    setMessages([]);
    setSuggestions([]);
    setDraft("");
    setError("");
    try { sessionStorage.removeItem(STORAGE); } catch {}
    inputRef.current?.focus();
  }

  // Administrative tools have their own workflows. Keep this customer widget out of the way.
  if (pathname?.startsWith("/admin")) return null;

  return (
    <div className="cinebot-root" data-i18n-skip="true">
      {open && <section className="cinebot-panel" role="dialog" aria-modal="false"
          aria-label={en ? "CineBot movie chat" : "Trò chuyện với CineBot"}>
        <header className="cinebot-header">
          <div className="cinebot-portrait" aria-hidden="true">🤖</div>
          <div className="cinebot-title"><strong>CineBot</strong><span><i className="cinebot-status-dot" />{en ? "Movie assistant · Online" : "Trợ lý điện ảnh · Sẵn sàng"}</span></div>
          <button type="button" className="cinebot-icon-button" onClick={clearChat}
            title={en ? "New chat" : "Cuộc trò chuyện mới"} aria-label={en ? "Clear chat" : "Xóa cuộc trò chuyện"}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <button type="button" className="cinebot-icon-button" onClick={() => { setOpen(false); toggleRef.current?.focus(); }}
            aria-label={en ? "Close chat" : "Đóng khung trò chuyện"}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" strokeLinecap="round"/></svg>
          </button>
        </header>
        <div className="cinebot-chat-area" aria-label={en ? "Chat messages" : "Nội dung trò chuyện"} aria-live="polite" aria-relevant="additions text">
          <div className="cinebot-date">CineBooking Pro · {en ? "Customer support" : "Tư vấn khách hàng"}</div>
          <div className="cinebot-line"><span className="cinebot-line-avatar" aria-hidden="true">🎬</span><div className="cinebot-bubble cinebot-bubble-assistant">{greeting}</div></div>
          {messages.map(item => <div key={item.id} className={`cinebot-line ${item.role === "user" ? "cinebot-line-user" : ""}`}>
            {item.role === "assistant" && <span className="cinebot-line-avatar" aria-hidden="true">🎬</span>}
            <div className="cinebot-message-group">
              <div className={`cinebot-bubble ${item.role === "user" ? "cinebot-bubble-user" : "cinebot-bubble-assistant"}`}>{item.content}</div>
              {item.role === "assistant" && <span className="cinebot-mode">{item.mode === "ai" ? (en ? "AI response" : "Trò chuyện AI") : (en ? "Movie assistant" : "Trợ lý tư vấn")}</span>}
              {!!item.links?.length && <div className="cinebot-links">{item.links.map((link, index) =>
                <Link href={link.href} key={`${link.href}-${index}`} onClick={() => setOpen(false)}>{link.label} <span aria-hidden="true">↗</span></Link>,
              )}</div>}
            </div>
          </div>)}
          {pending && <div className="cinebot-line"><span className="cinebot-line-avatar" aria-hidden="true">🎬</span><div className="cinebot-typing" aria-label={en ? "CineBot is typing" : "CineBot đang trả lời"}><b /><b /><b /></div></div>}
          {error && <div className="cinebot-error" role="alert">{error}<button type="button" onClick={() => send(messages.filter(item => item.role === "user").at(-1)?.content || draft)} disabled={pending}>{en ? "Retry" : "Thử lại"}</button></div>}
          <div ref={bottomRef} />
        </div>
        <div className="cinebot-actions" aria-label={en ? "Suggested questions" : "Câu hỏi gợi ý"}>
          {(suggestions.length ? suggestions : defaults).map((question, index) =>
            <button key={`${index}-${question}`} type="button" disabled={pending} onClick={() => send(question)}>{question}</button>,
          )}
        </div>
        <form className="cinebot-compose" onSubmit={event => { event.preventDefault(); void send(draft); }}>
          <label htmlFor="cinebot-input" className="sr-only">{en ? "Message CineBot" : "Nhắn tin cho CineBot"}</label>
          <textarea ref={inputRef} id="cinebot-input" rows={1} maxLength={MAX_TEXT} value={draft}
            onChange={event => setDraft(event.target.value)}
            onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send(draft); } }}
            placeholder={en ? "Ask CineBot anything about movies..." : "Hỏi CineBot về phim, lịch chiếu..."}/>
          <button type="submit" disabled={pending || !draft.trim()} aria-label={en ? "Send message" : "Gửi tin nhắn"}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m4 12 16-8-5 16-3-7-8-1Zm8 1 8-9" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </form>
        <div className="cinebot-footnote">{en ? "AI can make mistakes. Check actual prices before booking." : "Thông tin có thể sai sót. Kiểm tra giá thực tế trước khi đặt."}</div>
      </section>}
      <button ref={toggleRef} type="button" className="cinebot-launcher" aria-label={open ? (en ? "Close CineBot" : "Đóng CineBot") : (en ? "Chat with CineBot" : "Trò chuyện với CineBot")}
        aria-expanded={open} onClick={() => setOpen(value => !value)}>
        <span className="cinebot-launcher-icon" aria-hidden="true">{open ? "✕" : "🤖"}</span>
        {!open && <span className="cinebot-launcher-label">{en ? "Ask CineBot" : "Hỏi CineBot"}</span>}
      </button>
    </div>
  );
}
