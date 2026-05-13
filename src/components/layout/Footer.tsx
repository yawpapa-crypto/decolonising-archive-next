export default function Footer() {
  return (
    <footer className="site-disclaimer">
      <div className="site-disclaimer-inner">
        <p className="site-disclaimer-kicker">Rights, access and cultural care</p>
        <p>
          Decolonising Archive provides discovery metadata and educational
          descriptions for research and public learning. Rights remain with the
          original creators, communities, institutions or rights holders. Where
          materials are copyrighted, restricted or rights are unclear, the
          platform provides metadata and links to original sources rather than
          hosting full materials. Users are responsible for checking original
          source rights before reuse.
        </p>
        <p>
          Some records may relate to Indigenous, community-held or culturally
          sensitive knowledge. The platform aims to describe such materials
          respectfully and welcomes correction, review or removal requests from
          relevant communities and knowledge holders.
        </p>
        <nav className="site-disclaimer-links" aria-label="Legal and rights links">
          <a href="/terms">Terms of Use</a>
          <a href="/copyright">Copyright &amp; Permissions</a>
          <a href="/privacy">Privacy Policy</a>
          <a href="/takedown">Takedown / Rights Contact</a>
        </nav>
        <div className="site-disclaimer-meta">
          <span>Decolonising Archive</span>
          <span>yofosuasare.com</span>
        </div>
      </div>
    </footer>
  );
}
