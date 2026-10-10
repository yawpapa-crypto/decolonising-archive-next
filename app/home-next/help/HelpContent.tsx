"use client";
import { useState } from "react";
import Image from "next/image";
import FeedbackModal from "@/src/components/feedback/FeedbackModal";
import { HELP } from "./articles";
import type { EditorialPhoto } from "@/lib/media/unsplash";

export default function HelpContent({ photos }: { photos: Array<EditorialPhoto | null> }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [article, setArticle] = useState<string | null>(null);
  const term = query.toLowerCase().trim();
  const filtered = HELP.map((c, i) => ({ ...c, photo: photos[i], articles: c.articles.filter(a => `${c.title} ${a.title} ${a.body}`.toLowerCase().includes(term)) })).filter(c => c.articles.length);
  const shown = term ? filtered : filtered.filter(c => c.id === category);
  return <main className="account-page help-page">
    <header className="help-intro"><p className="help-eyebrow">A little guidance, a world to explore</p><h1>How can we help?</h1><p>Find your way through the archive, from your first discovery to your next collection.</p>
      <label className="help-searchbox"><svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden><circle cx="8.5" cy="8.5" r="5.5" /><path d="m13 13 4 4" /></svg><input type="search" aria-label="Search help articles" placeholder="Search articles, questions, and guidance…" value={query} onChange={e => { setQuery(e.target.value); setArticle(null); }} /><span className="help-search-hint">Help center</span></label>
    </header>
    <div className="help-grid">{filtered.map(c => <section className={`help-card${category === c.id ? " is-selected" : ""}`} key={c.id}>
      <button type="button" className="help-category" aria-pressed={category === c.id} aria-controls="help-results" onClick={() => { setCategory(c.id); setArticle(null); }}>
        <div className="help-card__image">{c.photo && <Image unoptimized src={c.photo.src} alt={c.photo.alt} fill sizes="(max-width: 760px) 100vw, 25vw" />}</div>
        <div className="help-card__body"><div className="help-card__title"><h2>{c.title}</h2><span aria-hidden>↗</span></div><p>{c.description}</p><span className="help-card__count">{c.articles.length} {c.articles.length === 1 ? "article" : "articles"}</span></div>
      </button>{c.photo && <p className="help-card__credit">Photo by <a href={c.photo.credit}>{c.photo.photographer}</a> on <a href="https://unsplash.com/?utm_source=decolonising_archive&utm_medium=referral">Unsplash</a></p>}
    </section>)}</div>
    <div id="help-results" className="help-results" aria-live="polite">
      {filtered.length === 0 && <div className="help-no-results"><h2>No articles found</h2><p>Try “collections”, “password”, or “sources”.</p><button type="button" onClick={() => setQuery("")}>Clear search</button></div>}
      {shown.map(c => <section className="help-guidance" key={c.id}><div className="help-section-heading"><h2>{c.title}</h2><span>{c.articles.length} {c.articles.length === 1 ? "article" : "articles"}</span></div>{c.articles.map((a, index) => {
        const id = `${c.id}-${index}`; const open = article === id;
        return <article className="help-answer" key={id}><h3><button type="button" aria-expanded={open} aria-controls={`answer-${id}`} onClick={() => setArticle(open ? null : id)}>{a.title}<span aria-hidden>{open ? "−" : "+"}</span></button></h3><div id={`answer-${id}`} hidden={!open}><p>{a.body}</p></div></article>;
      })}</section>)}
      {!category && !term && <section className="help-popular"><h2>A good place to start</h2><div>{HELP.slice(0,3).map(c => <button key={c.id} type="button" onClick={() => { setCategory(c.id); setArticle(`${c.id}-0`); }}>{c.articles[0].title}<span aria-hidden>→</span></button>)}</div></section>}
    </div>
    <section id="contact" className="help-contact"><div><p className="help-eyebrow">We’re here to listen</p><h2>Still looking for an answer?</h2><p>Ask a question, share a correction, or help us improve the archive.</p></div><div><FeedbackModal /><div className="help-icons"><a href="mailto:info@yofosuasare.com" aria-label="Email info@yofosuasare.com"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m3 6 9 7 9-7"/></svg></a><a href="https://www.instagram.com/afr_rd_/" aria-label="Instagram @afr_rd_" target="_blank" rel="noopener noreferrer"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8" fill="currentColor"/></svg></a></div></div></section>
  </main>;
}
