import Link from "next/link";
import { getCurrentUser } from "@/src/lib/auth";
import { mixedCollage } from "@/lib/home/for-you";
import HomeNav from "../HomeNav";
import HomeFooter from "../HomeFooter";
import {display,ui} from "../font";
import "../home.css";
import "./fieldnotes.css";
import Film from "./Film";
import SafeImg from "./SafeImg";
import { padWithFallbacks } from "@/lib/home/fallback-images";
import PracticeDrawing from "./PracticeDrawing";
export const metadata={title:"Fieldnotes | Decolonising Archive"};
const features=[
 {number:"01",title:"Begin with a theme",body:"Explore heritage and memory, Indigenous knowledge, arts and culture, and environment and land. Follow a question rather than a fixed route."},
 {number:"02",title:"Search across the archive",body:"Find records, photographs, and literature together. A word such as apprenticeship can lead from a participant’s account to a photograph, a source, and further reading."},
 {number:"03",title:"Keep the context",body:"An image is a starting point. Read the record, its theme, and its source before adding your own fieldnote. Keep what you observed distinct from what the source tells you."},
 {number:"04",title:"Read a place",body:"Explore the map to discover places in the archive. Connect what is around you with the records and stories that belong to it."},
 {number:"05",title:"Follow connections",body:"Move between statements, research notes, archive records, and literature. Use a possible connection as a question to investigate, rather than a conclusion."},
 {number:"06",title:"Gather what matters",body:"Save discoveries into collections, return to your research, and follow new records as the archive grows."},
];

export default async function Fieldnotes(){
 const [user,mix]=await Promise.all([getCurrentUser().catch(()=>null),mixedCollage("fieldnotes-editorial-v3",34)]);
 const images=padWithFallbacks(mix.map(m=>m.src),34);
 const credits=[...new Map(mix.filter(m=>m.credit).map(m=>[m.credit!.name,m.credit!])).values()];
 return <div className={`ared-home ${display.variable} ${ui.variable}`}><HomeNav signedIn={Boolean(user)} active="fieldnotes"/><main className="fieldnotes fn-sans"><header className="fn-hero"><div><p className="fn-kicker">Your next discovery starts here</p><h1>FIELDNOTES</h1><p>Turn curiosity into a collection.<br/>Explore photographs, records, and research with ARED Field—then keep the discoveries that matter.</p><Link className="fn-hero-link" href="/#ared-field">Meet ARED Field <span aria-hidden="true">↗</span></Link></div><div className="fn-floating" aria-hidden="true">{images.slice(0,5).map((src,i)=><SafeImg src={src} key={src} className={`fn-floating-${i}`}/>)}</div></header><section className="fn-opening"><div className="fn-section-heading"><h2>A whole archive. A new way in.</h2></div><Film/></section><section><div className="fn-section-heading"><h2>Make room for discovery</h2><Link href="/explore">Explore all ↗</Link></div><div className="fn-card-grid">{features.slice(0,3).map((f,i)=><article className="fn-card" key={f.number}>{images[i+5] && <SafeImg src={images[i+5]} alt="Archive imagery accompanying this research route" loading="lazy"/>}<div><span>{f.number} / Field guide</span><h3>{f.title}</h3><p>{f.body}</p></div></article>)}</div></section><section><div className="fn-section-heading"><h2>Go beyond the first find</h2><Link href="/elements">Browse the library ↗</Link></div><div className="fn-card-grid">{features.slice(3).map((f,i)=><article className="fn-card fn-card--collage" key={f.number}><div className="fn-triptych">{images.slice(8+i*3,11+i*3).map(src=><SafeImg src={src} alt="Archive source preview" loading="lazy" key={src}/>)}</div><div><span>{f.number} / Field guide</span><h3>{f.title}</h3><p>{f.body}</p></div></article>)}</div></section><section className="fn-research"><div className="fn-section-heading"><h2>From discovery to research</h2><span>ARED Research</span></div><Film research/></section><section className="fn-note"><p className="fn-kicker">Everything in one place</p><h2>Search. Read. Find. Research.</h2><PracticeDrawing/></section><div className="fn-cta"><a href="https://apps.apple.com/au/app/ared-field/id6794563712" target="_blank" rel="noopener noreferrer">Download iOS app</a>{!user && <Link className="fn-cta-secondary" href="/signup">Create an account</Link>}</div>{credits.length>0&&<p className="fn-credits">Photographs from Unsplash by {credits.map((c,i)=><span key={c.name}>{i>0?", ":""}<a href={c.url} target="_blank" rel="noopener noreferrer">{c.name}</a></span>)}.</p>}</main><HomeFooter/></div>;
}
