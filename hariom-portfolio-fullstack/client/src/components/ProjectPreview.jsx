function getProjectKind(project) {
  const name = project.name.toLowerCase();
  if (name.includes('ai')) return 'ai';
  if (name.includes('student') || name.includes('management')) return 'management';
  if (name.includes('itzfizz') || name.includes('hero')) return 'landing';
  if (name.includes('java')) return 'java';
  if (name.includes('portfolio') || name.includes('protoflio')) return 'portfolio';
  return 'dashboard';
}

function ProjectScene({ kind, title }) {
  if (kind === 'ai') return <>
    <rect x="54" y="75" width="532" height="250" rx="14" className="preview-panel"/>
    <rect x="54" y="75" width="142" height="250" rx="14" className="preview-sidebar"/>
    <rect x="181" y="75" width="15" height="250" className="preview-sidebar"/>
    <circle cx="82" cy="106" r="13" className="preview-accent-fill"/>
    <path d="M78 106h8m-4-4v8" className="preview-icon"/>
    <rect x="72" y="136" width="92" height="7" rx="3.5" className="preview-muted-fill"/>
    <rect x="72" y="155" width="75" height="7" rx="3.5" className="preview-muted-fill"/>
    <text x="222" y="111" className="preview-overline">PERSONAL AI ASSISTANT</text>
    <text x="222" y="144" className="preview-heading">A little help,</text>
    <text x="222" y="168" className="preview-heading preview-heading-accent">a lot of ideas.</text>
    <rect x="222" y="187" width="272" height="39" rx="10" className="preview-message"/>
    <circle cx="241" cy="206" r="7" className="preview-accent-fill"/>
    <rect x="256" y="202" width="176" height="7" rx="3.5" className="preview-muted-fill"/>
    <rect x="280" y="236" width="274" height="39" rx="10" className="preview-answer"/>
    <rect x="297" y="251" width="206" height="7" rx="3.5" className="preview-text-fill"/>
    <rect x="222" y="289" width="332" height="21" rx="10" className="preview-input"/>
  </>;

  if (kind === 'management') return <>
    <rect x="54" y="75" width="532" height="250" rx="14" className="preview-panel"/>
    <rect x="54" y="75" width="125" height="250" rx="14" className="preview-sidebar"/>
    <rect x="165" y="75" width="14" height="250" className="preview-sidebar"/>
    <circle cx="80" cy="105" r="10" className="preview-accent-fill"/>
    <rect x="70" y="132" width="82" height="7" rx="3.5" className="preview-muted-fill"/>
    <rect x="70" y="151" width="67" height="7" rx="3.5" className="preview-muted-fill"/>
    <rect x="70" y="170" width="76" height="7" rx="3.5" className="preview-muted-fill"/>
    <text x="203" y="108" className="preview-heading">Student overview</text>
    <text x="203" y="127" className="preview-caption">Records · attendance · progress</text>
    <rect x="203" y="145" width="108" height="49" rx="8" className="preview-card"/>
    <rect x="322" y="145" width="108" height="49" rx="8" className="preview-card"/>
    <rect x="441" y="145" width="108" height="49" rx="8" className="preview-card"/>
    <rect x="216" y="158" width="42" height="6" rx="3" className="preview-muted-fill"/>
    <rect x="216" y="173" width="61" height="8" rx="4" className="preview-accent-fill"/>
    <rect x="335" y="158" width="47" height="6" rx="3" className="preview-muted-fill"/>
    <rect x="335" y="173" width="53" height="8" rx="4" className="preview-purple-fill"/>
    <rect x="454" y="158" width="46" height="6" rx="3" className="preview-muted-fill"/>
    <rect x="454" y="173" width="67" height="8" rx="4" className="preview-green-fill"/>
    <rect x="203" y="209" width="346" height="91" rx="8" className="preview-card"/>
    {[0, 1, 2].map((row, i) => <g key={row}>
      <circle cx="222" cy={230 + i * 24} r="6" className={i === 1 ? 'preview-purple-fill' : 'preview-accent-fill'}/>
      <rect x="238" y={227 + i * 24} width={90 + (i % 2) * 20} height="6" rx="3" className="preview-text-fill"/>
      <rect x="420" y={227 + i * 24} width="74" height="6" rx="3" className="preview-muted-fill"/>
      <rect x="510" y={224 + i * 24} width="26" height="12" rx="6" className="preview-green-fill"/>
    </g>)}
  </>;

  if (kind === 'landing') return <>
    <rect x="54" y="75" width="532" height="250" rx="14" className="preview-panel"/>
    <rect x="74" y="93" width="492" height="29" rx="7" className="preview-nav"/>
    <circle cx="92" cy="107" r="6" className="preview-accent-fill"/>
    <rect x="108" y="104" width="74" height="6" rx="3" className="preview-text-fill"/>
    <rect x="417" y="103" width="35" height="6" rx="3" className="preview-muted-fill"/>
    <rect x="463" y="103" width="35" height="6" rx="3" className="preview-muted-fill"/>
    <rect x="509" y="98" width="43" height="16" rx="8" className="preview-accent-fill"/>
    <text x="91" y="163" className="preview-overline">A BETTER WAY TO GET STARTED</text>
    <text x="91" y="197" className="preview-heading preview-large-heading">Make your</text>
    <text x="91" y="226" className="preview-heading preview-large-heading preview-heading-accent">first impression</text>
    <text x="91" y="251" className="preview-heading preview-large-heading">count.</text>
    <rect x="91" y="270" width="142" height="25" rx="7" className="preview-accent-fill"/>
    <rect x="108" y="280" width="84" height="6" rx="3" className="preview-dark-fill"/>
    <circle cx="468" cy="207" r="74" className="preview-orbit"/>
    <circle cx="468" cy="207" r="52" className="preview-purple-fill"/>
    <circle cx="468" cy="207" r="33" className="preview-accent-fill"/>
    <circle cx="508" cy="161" r="8" className="preview-green-fill"/>
  </>;

  if (kind === 'java') return <>
    <rect x="54" y="75" width="532" height="250" rx="14" className="preview-panel"/>
    <rect x="54" y="75" width="532" height="37" rx="14" className="preview-nav"/>
    <rect x="54" y="98" width="532" height="14" className="preview-nav"/>
    <circle cx="75" cy="93" r="4" className="preview-pink-fill"/>
    <circle cx="89" cy="93" r="4" className="preview-yellow-fill"/>
    <circle cx="103" cy="93" r="4" className="preview-green-fill"/>
    <text x="127" y="97" className="preview-caption">Application.java</text>
    <rect x="54" y="112" width="334" height="213" className="preview-code"/>
    <text x="76" y="144" className="preview-code-muted">01</text>
    <text x="104" y="144" className="preview-code-purple">public class</text>
    <text x="188" y="144" className="preview-code-cyan">Application</text>
    <text x="266" y="144" className="preview-code-text"> &#123;</text>
    <text x="76" y="172" className="preview-code-muted">02</text>
    <text x="122" y="172" className="preview-code-purple">public static void</text>
    <text x="240" y="172" className="preview-code-yellow">main</text>
    <text x="273" y="172" className="preview-code-text">() &#123;</text>
    <text x="76" y="200" className="preview-code-muted">03</text>
    <text x="140" y="200" className="preview-code-green">System.out.println</text>
    <text x="258" y="200" className="preview-code-text">(</text>
    <text x="266" y="200" className="preview-code-yellow">"Build something."</text>
    <text x="366" y="200" className="preview-code-text">);</text>
    <text x="76" y="228" className="preview-code-muted">04</text>
    <text x="122" y="228" className="preview-code-text">&#125;</text>
    <text x="76" y="256" className="preview-code-muted">05</text>
    <text x="104" y="256" className="preview-code-text">&#125;</text>
    <rect x="409" y="128" width="153" height="76" rx="9" className="preview-card"/>
    <circle cx="433" cy="152" r="9" className="preview-orange-fill"/>
    <text x="451" y="155" className="preview-caption">JAVA BACKEND</text>
    <rect x="429" y="174" width="108" height="6" rx="3" className="preview-muted-fill"/>
    <rect x="409" y="218" width="153" height="82" rx="9" className="preview-card"/>
    <ellipse cx="451" cy="240" rx="18" ry="7" className="preview-purple-fill"/>
    <path d="M433 240v25c0 4 8 7 18 7s18-3 18-7v-25m-36 12c0 4 8 7 18 7s18-3 18-7" className="preview-db-line"/>
    <text x="480" y="249" className="preview-caption">DATA</text>
    <text x="480" y="264" className="preview-caption">LAYER</text>
  </>;

  if (kind === 'portfolio') return <>
    <rect x="54" y="75" width="532" height="250" rx="14" className="preview-panel"/>
    <rect x="74" y="92" width="492" height="31" rx="7" className="preview-nav"/>
    <circle cx="94" cy="107" r="7" className="preview-accent-fill"/>
    <rect x="110" y="104" width="65" height="6" rx="3" className="preview-text-fill"/>
    <rect x="425" y="104" width="32" height="6" rx="3" className="preview-muted-fill"/>
    <rect x="467" y="104" width="32" height="6" rx="3" className="preview-muted-fill"/>
    <rect x="509" y="104" width="37" height="6" rx="3" className="preview-muted-fill"/>
    <text x="94" y="165" className="preview-overline">DESIGN · BUILD · CREATE</text>
    <text x="94" y="199" className="preview-heading preview-large-heading">Hello, I’m</text>
    <text x="94" y="229" className="preview-heading preview-large-heading preview-heading-accent">a developer.</text>
    <rect x="94" y="249" width="168" height="6" rx="3" className="preview-muted-fill"/>
    <rect x="94" y="263" width="136" height="6" rx="3" className="preview-muted-fill"/>
    <rect x="94" y="283" width="78" height="23" rx="6" className="preview-accent-fill"/>
    <rect x="108" y="292" width="48" height="5" rx="2.5" className="preview-dark-fill"/>
    <rect x="377" y="146" width="152" height="150" rx="13" className="preview-card"/>
    <circle cx="453" cy="204" r="35" className="preview-orbit"/>
    <circle cx="453" cy="204" r="25" className="preview-purple-fill"/>
    <circle cx="453" cy="204" r="14" className="preview-accent-fill"/>
    <rect x="400" y="255" width="106" height="7" rx="3.5" className="preview-text-fill"/>
    <rect x="416" y="271" width="73" height="5" rx="2.5" className="preview-muted-fill"/>
  </>;

  return <>
    <rect x="54" y="75" width="532" height="250" rx="14" className="preview-panel"/>
    <rect x="54" y="75" width="532" height="38" rx="14" className="preview-nav"/>
    <rect x="54" y="99" width="532" height="14" className="preview-nav"/>
    <circle cx="76" cy="94" r="4" className="preview-pink-fill"/>
    <circle cx="90" cy="94" r="4" className="preview-yellow-fill"/>
    <circle cx="104" cy="94" r="4" className="preview-green-fill"/>
    <text x="127" y="98" className="preview-caption">{title}</text>
    <text x="82" y="151" className="preview-overline">PROJECT DASHBOARD</text>
    <text x="82" y="177" className="preview-heading">A clear view of your work.</text>
    <rect x="82" y="193" width="218" height="104" rx="9" className="preview-card"/>
    <path d="M106 269c18-26 34-12 52-37s32 3 48-18 29 1 43-12" className="preview-chart"/>
    <path d="M105 278h171" className="preview-grid-line"/>
    <rect x="320" y="193" width="111" height="47" rx="8" className="preview-card"/>
    <rect x="444" y="193" width="111" height="47" rx="8" className="preview-card"/>
    <rect x="336" y="208" width="48" height="6" rx="3" className="preview-muted-fill"/>
    <rect x="336" y="222" width="56" height="7" rx="3.5" className="preview-accent-fill"/>
    <rect x="460" y="208" width="48" height="6" rx="3" className="preview-muted-fill"/>
    <rect x="460" y="222" width="56" height="7" rx="3.5" className="preview-purple-fill"/>
    <rect x="320" y="250" width="235" height="47" rx="8" className="preview-card"/>
    <rect x="337" y="269" width="111" height="7" rx="3.5" className="preview-text-fill"/>
    <rect x="470" y="269" width="65" height="7" rx="3.5" className="preview-green-fill"/>
  </>;
}

export default function ProjectPreview({ project }) {
  const kind = getProjectKind(project);
  return <svg className={`project-preview project-preview-${kind}`} viewBox="0 0 640 360" role="img" aria-labelledby={`preview-title-${project.id}`}>
    <title id={`preview-title-${project.id}`}>{project.name} illustrative project preview</title>
    <defs>
      <linearGradient id={`preview-bg-${project.id}`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor={kind === 'java' ? '#24204b' : kind === 'landing' ? '#103941' : '#29204d'}/>
        <stop offset="1" stopColor="#0d1222"/>
      </linearGradient>
      <radialGradient id={`preview-glow-${project.id}`}>
        <stop offset="0" stopColor={kind === 'java' ? '#f59e0b' : '#67e8f9'} stopOpacity=".23"/>
        <stop offset="1" stopColor="#67e8f9" stopOpacity="0"/>
      </radialGradient>
    </defs>
    <rect width="640" height="360" fill={`url(#preview-bg-${project.id})`}/>
    <circle cx="510" cy="84" r="190" fill={`url(#preview-glow-${project.id})`}/>
    <circle cx="106" cy="304" r="140" fill={`url(#preview-glow-${project.id})`} opacity=".55"/>
    <ProjectScene kind={kind} title={project.name}/>
  </svg>;
}
