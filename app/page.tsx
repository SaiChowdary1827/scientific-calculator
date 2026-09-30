import Calculator from "@/components/Calculator";

export default function Home() {
  return (
    <main className="page">
      <header className="topbar">
        <div>
          <div className="brand">CalcLab</div>
          <div className="tagline">Scientific calculator toolbox</div>
        </div>
        <div className="status">V1 • Web</div>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">CALCULATOR ENGINE</p>
          <h1>One calculator.<br />Many scientific tools.</h1>
          <p className="heroText">
            A clean foundation for arithmetic, scientific functions, history,
            conversions and the larger calculator toolbox we will build next.
          </p>
        </div>
        <div className="heroBadge">
          <span>π</span>
          <small>READY</small>
        </div>
      </section>

      <Calculator />

      <section className="toolGrid">
        {[
          ["Scientific", "sin • cos • tan • log • ln • √"],
          ["Algebra", "Equations • powers • roots"],
          ["Statistics", "Mean • median • variance"],
          ["Converters", "Length • mass • temperature"],
          ["Engineering", "Scientific & engineering notation"],
          ["More tools", "Matrix • complex • finance • physics"]
        ].map(([title, desc]) => (
          <article className="toolCard" key={title}>
            <div className="toolIcon">+</div>
            <h3>{title}</h3>
            <p>{desc}</p>
            <span className="coming">Coming in toolbox</span>
          </article>
        ))}
      </section>

      <footer className="footer">
        <span>CalcLab V1</span>
        <span>Built for web → Android → mobile</span>
      </footer>
    </main>
  );
}