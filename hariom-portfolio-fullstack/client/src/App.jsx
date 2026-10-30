import { useState } from 'react';
import { ArrowUpRight, Github, Linkedin, Menu, X, Code2, Layers3, Sparkles, ExternalLink } from 'lucide-react';
import { projects } from './data/projects.js';
import { profile } from './data/profile.js';
import SectionTitle from './components/SectionTitle.jsx';
import GitHubSection from './components/GitHub.jsx';
import ContactForm from './components/ContactForm.jsx';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const skills = [
  { icon: Code2, title: 'Frontend development', text: 'Creating responsive and accessible interfaces.', tags: ['HTML', 'CSS', 'JavaScript', 'React'] },
  { icon: Layers3, title: 'Backend foundations', text: 'Learning how APIs, servers and databases work together.', tags: ['Node.js', 'Express', 'MongoDB', 'REST APIs'] },
  { icon: Sparkles, title: 'Developer workflow', text: 'Building consistently, collaborating and improving code.', tags: ['Git', 'GitHub', 'VS Code', 'Debugging'] }
];

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);
  return <>
    <header className="header">
      <a className="brand" href="#home" onClick={closeMenu}><span className="brand-icon">H</span> hariom<span className="accent">.</span></a>
      <button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation">{menuOpen ? <X/> : <Menu/>}</button>
      <nav className={menuOpen ? 'nav open' : 'nav'}>
        {['about','experience','education','skills','projects','github','contact'].map(item => <a key={item} href={`#${item}`} onClick={closeMenu}>{item}</a>)}
        <a className="nav-contact" href="#contact" onClick={closeMenu}>Let's talk <ArrowUpRight size={15}/></a>
      </nav>
    </header>

    <main>
      <section className="hero wrap" id="home">
        <div className="hero-content">
          <div className="availability"><i/> ASPIRING SOFTWARE DEVELOPER <span>· INDIA</span></div>
          <h1>Building digital<br/>experiences with<br/><span className="gradient">purpose & precision.</span></h1>
          <p className="intro">Hey, I'm <strong>{profile.name}</strong>. {profile.introduction}</p>
          <div className="hero-buttons"><a className="button primary" href="#projects">Explore projects <ArrowUpRight size={16}/></a><a className="button secondary" href={`${API_URL}/api/resume/download`}>Download resume ↓</a></div>
          <div className="hero-foot"><span>REACT · NODE · JAVASCRIPT</span><span>SCROLL TO EXPLORE ↓</span></div>
        </div>
        <div className="hero-visual"><div className="glow-orbit orbit1"/><div className="glow-orbit orbit2"/>
          <div className="editor"><div className="editor-head"><span>● ● ●</span><span>hariom.dev.js</span><span>JS</span></div>
            <pre><code><span className="pink">const</span> developer = {'{'}{'\n'}  name: <span className="green">'Hariom Tiwari'</span>,{'\n'}  role: <span className="green">'Software Developer'</span>,{'\n'}  stack: [<span className="green">'React'</span>, <span className="green">'Node.js'</span>],{'\n'}  mindset: <span className="green">'Keep building'</span>,{'\n'}  openToWork: <span className="blue">true</span>{'\n'}{'}'};</code></pre>
            <div className="editor-foot"><span>● AVAILABLE TO LEARN & BUILD</span><span>UTF-8</span></div>
          </div><div className="float-note note-a">✳ Curious by nature</div><div className="float-note note-b">⌁ Build. Learn. Repeat.</div>
        </div>
      </section>

      <div className="marquee"><div>FRONTEND DEVELOPMENT <b>✳</b> FULL-STACK LEARNING <b>✳</b> PROBLEM SOLVING <b>✳</b> BUILDING IN PUBLIC <b>✳</b> FRONTEND DEVELOPMENT <b>✳</b> FULL-STACK LEARNING <b>✳</b></div></div>

      <section className="section wrap" id="about">
        <SectionTitle number="01" eyebrow="ABOUT ME" title="A developer in progress." muted="Focused on meaningful progress."/>
        <div className="about-grid"><p className="about-big">{profile.about[0]}</p><div className="about-detail">{profile.about.slice(1).map(paragraph => <p key={paragraph}>{paragraph}</p>)}<div className="socials"><a href="https://github.com/HARIOM45-67" target="_blank" rel="noreferrer"><Github size={16}/> GitHub <ArrowUpRight size={13}/></a><a href="https://www.linkedin.com/in/hariom-tiwari-913a8537a/" target="_blank" rel="noreferrer"><Linkedin size={16}/> LinkedIn <ArrowUpRight size={13}/></a></div></div></div>
      </section>

      <section className="section wrap" id="experience">
        <SectionTitle number="02" eyebrow="EXPERIENCE" title="Learning through" muted="hands-on experience."/>
        <div className="experience-list">{profile.experience.map(item => {
          const dateRange = item.startDate && item.endDate
            ? `${item.startDate} – ${item.endDate}`
            : item.startDate || item.endDate;
          return <article className="experience-card" key={item.organization}>
            <div className="experience-heading"><div><h3>{item.organization}</h3>{item.position && <p>{item.position}</p>}</div>{dateRange && <span>{dateRange}</span>}</div>
            {item.description && <p className="experience-description">{item.description}</p>}
          </article>;
        })}</div>
      </section>

      <section className="section wrap" id="education">
        <SectionTitle number="03" eyebrow="EDUCATION" title="Building strong" muted="foundations."/>
        <article className="education-card">
          <div className="education-heading"><div><h3>{profile.education.degree}</h3><p>{profile.education.specialization}</p></div><span>Expected {profile.education.expectedGraduation}</span></div>
          <p className="education-institution">{profile.education.institution}</p>
        </article>
      </section>

      <section className="section wrap" id="skills">
        <SectionTitle number="04" eyebrow="TOOLKIT" title="The tools behind" muted="what I build."/>
        <div className="skill-grid">{skills.map((skill, i) => {const Icon = skill.icon; return <article className="skill-card" key={skill.title}><div className="skill-top"><Icon/><span>0{i+1}</span></div><h3>{skill.title}</h3><p>{skill.text}</p><div className="tags">{skill.tags.map(tag => <span key={tag}>{tag}</span>)}</div></article>})}</div>
      </section>

      <section className="section wrap" id="projects">
        <SectionTitle number="05" eyebrow="SELECTED WORK" title="Built with curiosity." muted="Improved with every iteration."/>
        {projects.length > 0
          ? <div className="project-grid">{projects.map((project, i) => <article className="project-card" key={project.name}><div className={`project-art art-${i+1}`}><span>0{i+1} / PROJECT</span><div className="art-symbol">{['⌘','◈','✳'][i%3]}</div></div><div className="project-content"><div className="project-title"><div><small>FEATURED PROJECT</small><h3>{project.name}</h3></div><a href={project.liveUrl || project.repoUrl} target="_blank" rel="noreferrer" aria-label={`Open ${project.name}`}><ArrowUpRight/></a></div><p>{project.description}</p><div className="tags">{project.stack.map(tag => <span key={tag}>{tag}</span>)}</div><div className="project-links">{project.liveUrl && <a href={project.liveUrl} target="_blank" rel="noreferrer">Live demo <ExternalLink size={13}/></a>}<a href={project.repoUrl} target="_blank" rel="noreferrer">Source code <Github size={13}/></a></div></div></article>)}</div>
          : <p className="muted-text project-empty">Projects will appear here when verified project details are published.</p>}
      </section>

      <section className="section wrap" id="github">
        <SectionTitle number="06" eyebrow="OPEN SOURCE" title="What I'm building" muted="and sharing on GitHub."/>
        <GitHubSection/>
      </section>

      <section className="section wrap" id="resume">
        <SectionTitle number="07" eyebrow="RESUME" title="Interested in my" muted="experience?"/>
        <div className="resume-card"><p className="muted-text">The latest resume is available here when uploaded.</p><a className="button secondary" href={`${API_URL}/api/resume/download`}>Download resume <ArrowUpRight size={16}/></a></div>
      </section>

      <section className="contact-section" id="contact"><div className="wrap contact-wrap">
        <div><SectionTitle number="08" eyebrow="GET IN TOUCH" title="Have an idea?" muted="Let's build something useful."/><p className="contact-lede">I'm open to internship opportunities, collaborations, feedback, and conversations about technology.</p><div className="socials contact-links"><a className="email-link" href="mailto:tiwarihariom211@gmail.com">tiwarihariom211@gmail.com <ArrowUpRight size={16}/></a><a href="https://www.linkedin.com/in/hariom-tiwari-913a8537a/" target="_blank" rel="noreferrer">LinkedIn <ArrowUpRight size={13}/></a></div></div>
        <ContactForm/>
      </div></section>
    </main>
    <footer className="footer wrap"><a className="brand" href="#home"><span className="brand-icon">H</span> hariom<span className="accent">.</span></a><span>Designed & built by Hariom Tiwari · <span id="year">{new Date().getFullYear()}</span></span><a href="#home">BACK TO TOP ↑</a></footer>
  </>;
}