"use client";
import { useEffect, useRef, useState } from "react";

const SRC = "/videos/ared-explainer.mp4?v=6";
const POSTER = "/videos/ared-explainer-poster.jpg?v=7";
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

const Ic = ({ d }: { d: string }) => <svg viewBox="0 0 24 24" aria-hidden="true"><path d={d} /></svg>;
const PLAY = "M8 5.5v13l11-6.5z";
const PAUSE = "M8 5v14M16 5v14";
const SOUND = "M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4zM15.5 9a4 4 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11";
const MUTED = "M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4zM16 9.5l5 5M21 9.5l-5 5";
const LOW = "M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4zM15.5 9a4 4 0 0 1 0 6";
const FULL = "M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7";

/** Small flat film tile with outlined, minimal controls that appear on hover. */
export default function FilmPreview({ src: SRC_IN = SRC, poster = POSTER, label = "ARED film, 55 seconds", className = "" }: { src?: string; poster?: string; label?: string; className?: string } = {}) {
  const box = useRef<HTMLDivElement>(null);
  const v = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [vol, setVol] = useState(1);
  const [t, setT] = useState(0);
  const [dur, setDur] = useState(0);
  const [engaged, setEngaged] = useState(false);
  const [src, setSrc] = useState<string | undefined>(undefined);
  const engagedRef = useRef(false);
  const inView = useRef(false);

  // The 5 MB film is only requested when the tile is within a screen of the viewport.
  useEffect(() => {
    const b = box.current; if (!b) return;
    const near = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSrc(SRC_IN); near.disconnect(); } }, { rootMargin: "600px 0px" });
    near.observe(b);
    return () => near.disconnect();
  }, [SRC_IN]);

  useEffect(() => {
    const el = v.current; if (!el) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.aredCalm === "true";
    const io = new IntersectionObserver(([e]) => { inView.current = e.isIntersecting && !still; if (!e.isIntersecting) el.pause(); else if (!still && el.muted && !engagedRef.current) el.play().catch(() => {}); }, { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  // The source arrives after the tile is near; start the muted loop as soon as it can play.
  const autoStart = (e: React.SyntheticEvent<HTMLVideoElement>) => { const el = e.currentTarget; if (inView.current && el.muted && !engagedRef.current) el.play().catch(() => {}); };
  useEffect(() => { engagedRef.current = engaged; }, [engaged]);

  const toggle = () => { const el = v.current; if (!el) return; if (el.paused) el.play().catch(() => {}); else el.pause(); };
  const withSound = () => { const el = v.current; if (!el) return; el.muted = false; el.loop = false; el.currentTime = 0; setEngaged(true); el.play().catch(() => {}); };
  const mute = () => { const el = v.current; if (!el) return; el.muted = !el.muted; };
  const full = () => { const b = box.current as (HTMLDivElement & { webkitRequestFullscreen?: () => void }) | null; if (!b) return; if (document.fullscreenElement) void document.exitFullscreen(); else if (b.requestFullscreen) void b.requestFullscreen(); else b.webkitRequestFullscreen?.(); };
  const volume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = v.current; if (!el) return;
    const n = Number(e.target.value) / 100;
    el.volume = n;
    // Dragging up from zero is an unmute; dragging to zero is a mute.
    el.muted = n === 0;
  };
  const seek = (e: React.ChangeEvent<HTMLInputElement>) => { const el = v.current; if (el && dur) el.currentTime = (Number(e.target.value) / 1000) * dur; };

  return (
    <div className={"ared-ft" + (className ? " " + className : "") + (playing ? " is-playing" : "") + (!muted ? " has-sound" : "")} ref={box}>
      <video ref={v} src={src} poster={poster} muted loop playsInline preload="none" aria-label={label}
        onClick={toggle} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onVolumeChange={(e) => { const el = e.target as HTMLVideoElement; setMuted(el.muted); setVol(el.volume); }}
        onCanPlay={autoStart} onLoadedMetadata={(e) => setDur((e.target as HTMLVideoElement).duration)} onTimeUpdate={(e) => setT((e.target as HTMLVideoElement).currentTime)} />
      {muted && <button type="button" className="ared-ft__snd" onClick={withSound}><Ic d={PLAY} />Play with sound</button>}
      <div className="ared-ft__bar" role="group" aria-label="Film controls">
        <button type="button" onClick={toggle} aria-label={playing ? "Pause" : "Play"}><Ic d={playing ? PAUSE : PLAY} /></button>
        <input className="ared-ft__seek" type="range" min={0} max={1000} value={dur ? Math.round((t / dur) * 1000) : 0} onChange={seek} aria-label="Seek" style={{ ["--p" as string]: dur ? `${(t / dur) * 100}%` : "0%" } as React.CSSProperties} />
        <span className="ared-ft__time">{fmt(t)}<i> / {fmt(dur)}</i></span>
        <div className="ared-ft__vol">
          <button type="button" onClick={mute} aria-label={muted ? "Unmute" : "Mute"}><Ic d={muted || vol === 0 ? MUTED : vol < 0.5 ? LOW : SOUND} /></button>
          <input className="ared-ft__seek ared-ft__volume" type="range" min={0} max={100} value={muted ? 0 : Math.round(vol * 100)} onChange={volume} aria-label="Volume" style={{ ["--p" as string]: `${muted ? 0 : vol * 100}%` } as React.CSSProperties} />
        </div>
        <button type="button" onClick={full} aria-label="Full screen"><Ic d={FULL} /></button>
      </div>
    </div>
  );
}
