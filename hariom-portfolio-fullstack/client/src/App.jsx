import { useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight, Award, BookOpen, Braces, BriefcaseBusiness, ChefHat, Code2, Database,
  Globe2, Github, HeartHandshake, Instagram, Layers3, Linkedin, Mail, MapPin, Menu,
  MessageCircle, Moon, Send, Sparkles, Sun, Wrench, X, Youtube
} from 'lucide-react';
import { profile } from './data/profile.js';
import { certificates } from './data/certificates.js';
import { articles } from './data/articles.js';
import { api, getApiErrorMessage } from './lib/api.js';
import SectionTitle from './components/SectionTitle.jsx';
import GitHubSection from './components/GitHub.jsx';
import ContactForm from './components/ContactForm.jsx';
import ProjectsSection from './components/ProjectsSection.jsx';
import ResumeSection from './components/ResumeSection.jsx';

const primaryNavigation = ['about', 'skills', 'projects', 'experience', 'contact'];
const additionalNavigation = [
  'education', 'certifications', 'github', 'coding-profiles', 'professional-profiles',
  'services', 'blog', 'resume', 'testimonials', 'analytics', 'footer'
];
const sectionLabels = {
  home: 'Home',
  about: 'About me',
  skills: 'Technical skills',
  projects: 'Projects',
  experience: 'Experience',
  education: 'Education',
  certifications: 'Certifications & achievements',
  github: 'GitHub',
  'coding-profiles': 'Coding profiles',
  'professional-profiles': 'Professional profiles',
  services: 'What I do',
  blog: 'Blog & articles',
  contact: 'Contact',
  resume: 'Resume',
  testimonials: 'Testimonials',
  analytics: 'Analytics & privacy',
  footer: 'Footer'
};
const skills = [
  { icon: Code2, title: 'Programming language', text: 'Building and learning with JavaScript.', tags: ['JavaScript'] },
  { icon: Layers3, title: 'Frontend development', text: 'Creating responsive interfaces with modern web fundamentals.', tags: ['HTML', 'CSS', 'React'] },
  { icon: BriefcaseBusiness, title: 'Backend development', text: 'Connecting applications to APIs and server-side features.', tags: ['Node.js', 'Express', 'REST APIs'] },
  { icon: Database, title: 'Database', text: 'Learning to model and work with application data.', tags: ['MongoDB'] },
  { icon: Sparkles, title: 'AI & machine learning', text: 'Exploring AI, machine learning and generative AI.', tags: ['Exploring'] },
  { icon: Wrench, title: 'Tools & workflow', text: 'Tools used to build, collaborate and improve projects.', tags: ['Git', 'GitHub', 'VS Code'] }
];
const services = [
  { title: 'Frontend development', text: 'Responsive, accessible web interfaces built with React and modern JavaScript.' },
  { title: 'Web applications', text: 'Thoughtful user experiences connected to useful, reliable application features.' },
  { title: 'REST API development', text: 'Node.js and Express APIs with validation and practical database integration.' },
  { title: 'AI/ML exploration', text: 'Learning-focused experiments with artificial intelligence and machine learning.' }
];
const socialProfiles = [
  { name: 'GitHub', url: 'https://github.com/HARIOM45-67', icon: Github },
  { name: 'LinkedIn', url: 'https://www.linkedin.com/in/hariom-tiwari-913a8537a/', icon: Linkedin },
  { name: 'Instagram', url: 'https://www.instagram.com/hariom', icon: Instagram },
  { name: 'Telegram', url: 'https://t.me/Diler_brahman', icon: Send },
  { name: 'YouTube', url: 'https://youtube.com/@hariomcodding', icon: Youtube },
  { name: 'WhatsApp', url: 'https://wa.me/917859031017', icon: MessageCircle }
];
const codingProfiles = [
  { name: 'LeetCode', url: 'https://leetcode.com/u/hariom45_67/', icon: Code2 },
  { name: 'W3Schools', url: 'https://pathfinder.w3schools.com/profile', icon: Globe2 },
  { name: 'CodeChef', url: 'https://www.codechef.com/users/public_flag_23', icon: ChefHat },
  { name: 'GeeksforGeeks', url: 'https://www.geeksforgeeks.org/profile/dlerbr0td8', icon: Braces }
];
const professionalProfiles = [
  { name: 'Freelancer', url: 'https://www.freelancer.com/insights/', description: 'Professional profile and insights', icon: BriefcaseBusiness }
];
const analyticsStorageKey = 'portfolio-analytics-consent';
const analyticsVisitorKey = 'portfolio-analytics-visitor';

function createVisitorId() {
  const savedId = localStorage.getItem(analyticsVisitorKey);
  if (savedId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(savedId)) {
    return savedId;
  }
  const visitorId = crypto.randomUUID();
  localStorage.setItem(analyticsVisitorKey, visitorId);
  return visitorId;
}

function AnalyticsConsent({ open, onChoose }) {
  if (!open) return null;
  return <aside className="analytics-consent" aria-label="Analytics preferences">
    <div>
      <strong>Privacy-first analytics</strong>
      <p>Allow anonymous visitor and section counts? We never store your IP address. You can change this choice anytime.</p>
    </div>
    <div className="analytics-consent-actions">
      <button className="button secondary" onClick={() => onChoose(false)}>Decline</button>
      <button className="button primary" onClick={() => onChoose(true)}>Allow analytics</button>
    </div>
  </aside>;
}

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const moreMenuRef = useRef(null);
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('portfolio-theme') === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });
  const [resume, setResume] = useState({
    originalName: 'Hariom Tiwari Resume.pdf',
    downloadUrl: '/resume.pdf',
    uploadedAt: null,
    isLocal: true
  });
  const [resumeLoading, setResumeLoading] = useState(true);
  const [resumeError, setResumeError] = useState('');
  const [analyticsConsent, setAnalyticsConsent] = useState(null);
  const [analyticsPromptOpen, setAnalyticsPromptOpen] = useState(true);
  const [analyticsError, setAnalyticsError] = useState('');
  const reportedSections = useRef(new Set());
  const closeMenu = () => {
    setMenuOpen(false);
    if (moreMenuRef.current) moreMenuRef.current.open = false;
  };

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem('portfolio-theme', theme);
    } catch {
      // The selected theme remains applied for this session when storage is disabled.
    }
  }, [theme]);

  useEffect(() => {
    try {
      const storedConsent = window.localStorage.getItem(analyticsStorageKey);
      if (storedConsent === 'accepted' || storedConsent === 'declined') {
        setAnalyticsConsent(storedConsent === 'accepted');
        setAnalyticsPromptOpen(false);
      }
    } catch (error) {
      setAnalyticsError(error instanceof Error ? error.message : 'Unable to load analytics preferences.');
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    api.get('/api/resume', { signal: controller.signal })
      .then(response => setResume(response.data.resume || {
        originalName: 'Hariom Tiwari Resume.pdf',
        downloadUrl: '/resume.pdf',
        uploadedAt: null,
        isLocal: true
      }))
      .catch(error => {
        if (!controller.signal.aborted) {
          setResumeError(getApiErrorMessage(error, 'Unable to check resume availability.'));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setResumeLoading(false);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (analyticsConsent !== true) return undefined;
    const controller = new AbortController();
    let visitorId;
    try {
      visitorId = createVisitorId();
    } catch (error) {
      setAnalyticsError(error instanceof Error ? error.message : 'Analytics storage is unavailable.');
      return undefined;
    }

    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const project = entry.target.dataset.analyticsProject;
        const identifier = project ? `project:${project}` : `section:${entry.target.id}`;
        if (reportedSections.current.has(identifier)) continue;
        reportedSections.current.add(identifier);
        const event = project ? { visitorId, project } : { visitorId, section: entry.target.id };
        api.post('/api/analytics/view', event, { signal: controller.signal })
          .catch(error => {
            if (!controller.signal.aborted) {
              setAnalyticsError(getApiErrorMessage(error, 'Unable to record an analytics event.'));
            }
          });
      }
    }, { threshold: 0.25 });

    document.querySelectorAll('main section[id], footer[id], .project-card[data-analytics-project]').forEach(section => observer.observe(section));
    return () => {
      observer.disconnect();
      controller.abort();
    };
  }, [analyticsConsent]);

  useEffect(() => {
    const sections = Object.keys(sectionLabels)
      .map(id => document.getElementById(id))
      .filter(Boolean);
    const observer = new IntersectionObserver(entries => {
      const visibleSection = entries
        .filter(entry => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visibleSection) setActiveSection(visibleSection.target.id);
    }, { rootMargin: '-20% 0px -65% 0px', threshold: [0, 0.1, 0.25, 0.5] });
    sections.forEach(section => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  function chooseAnalytics(allow) {
    try {
      window.localStorage.setItem(analyticsStorageKey, allow ? 'accepted' : 'declined');
      setAnalyticsConsent(allow);
      setAnalyticsPromptOpen(false);
      setAnalyticsError('');
    } catch (error) {
      setAnalyticsError(error instanceof Error ? error.message : 'Unable to save analytics preferences.');
    }
  }

  function openAnalyticsPreferences() {
    setAnalyticsPromptOpen(true);
    document.getElementById('analytics')?.scrollIntoView({ behavior: 'smooth' });
  }

  return <>
    <header className="header">
      <a className="brand" href="#home" onClick={closeMenu}><span className="brand-icon">H</span> Hariom<span className="accent">.</span></a>
      <button className="mobile-menu" onClick={() => setMenuOpen(value => !value)} aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-controls="main-navigation" aria-expanded={menuOpen}>{menuOpen ? <X/> : <Menu/>}</button>
      <nav id="main-navigation" className={menuOpen ? 'nav open' : 'nav'} aria-label="Main navigation">
        {primaryNavigation.map(item => <a key={item} className={activeSection === item ? 'active' : undefined} aria-current={activeSection === item ? 'location' : undefined} href={`#${item}`} onClick={closeMenu}>{sectionLabels[item]}</a>)}
        <details className="nav-more" ref={moreMenuRef}>
          <summary className={additionalNavigation.includes(activeSection) ? 'active' : undefined}>More <span aria-hidden="true">⌄</span></summary>
          <div className="nav-more-menu">
            {additionalNavigation.map(item => <a key={item} className={activeSection === item ? 'active' : undefined} aria-current={activeSection === item ? 'location' : undefined} href={`#${item}`} onClick={closeMenu}>{sectionLabels[item]}</a>)}
          </div>
        </details>
        <button className="theme-toggle" onClick={() => setTheme(value => value === 'dark' ? 'light' : 'dark')} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} aria-pressed={theme === 'light'}>
          {theme === 'dark' ? <Sun size={16}/> : <Moon size={16}/>}
        </button>
      </nav>
    </header>

    <main>
      <section className="hero wrap" id="home">
        <div className="hero-content">
          <div className="availability"><i/> SOFTWARE DEVELOPER <span>· INDIA</span></div>
          <h1>Turning ideas into<br/>impactful digital<br/><span className="gradient">solutions.</span></h1>
          <p className="intro">Hey, I'm <strong>{profile.name}</strong>. {profile.introduction}</p>
          <div className="hero-buttons">
            <a className="button primary" href="#projects">View projects <ArrowUpRight size={16}/></a>
            {resume?.downloadUrl
              ? <a className="button secondary" href={resume.isLocal ? resume.downloadUrl : api.getUri({ url: resume.downloadUrl })} download>Download resume ↓</a>
              : <a className="button secondary" href="#resume">Resume details ↓</a>}
          </div>
          <div className="hero-socials" aria-label="Social profiles">
            <a href="https://github.com/HARIOM45-67" target="_blank" rel="noopener noreferrer"><Github size={17}/> GitHub <ArrowUpRight size={13}/></a>
            <a href="https://www.linkedin.com/in/hariom-tiwari-913a8537a/" target="_blank" rel="noopener noreferrer"><Linkedin size={17}/> LinkedIn <ArrowUpRight size={13}/></a>
          </div>
          <div className="hero-foot"><span>REACT · NODE · JAVASCRIPT</span><span>SCROLL TO EXPLORE ↓</span></div>
        </div>
        <div className="hero-visual">
          <div className="glow-orbit orbit1"/><div className="glow-orbit orbit2"/>
          <div className="hero-profile">
            <img src="https://github.com/HARIOM45-67.png" alt="Hariom Tiwari's GitHub profile" width="112" height="112" fetchPriority="high"/>
            <span>SOFTWARE DEVELOPER · MCA STUDENT</span>
          </div>
          <div className="editor"><div className="editor-head"><span>● ● ●</span><span>hariom.dev.js</span><span>JS</span></div>
            <pre><code><span className="pink">const</span> developer = {'{'}{'\n'}  name: <span className="green">'Hariom Tiwari'</span>,{'\n'}  role: <span className="green">'Software Developer'</span>,{'\n'}  stack: [<span className="green">'React'</span>, <span className="green">'Node.js'</span>],{'\n'}  mindset: <span className="green">'Keep building'</span>,{'\n'}  openToWork: <span className="blue">true</span>{'\n'}{'}'};</code></pre>
            <div className="editor-foot"><span>● AVAILABLE TO LEARN & BUILD</span><span>UTF-8</span></div>
          </div>
          <div className="float-note note-a">✳ Curious by nature</div><div className="float-note note-b">⌁ Build. Learn. Repeat.</div>
        </div>
      </section>

      <div className="marquee" aria-label="Frontend development, full-stack learning, problem solving"><div>FRONTEND DEVELOPMENT <b>✳</b> FULL-STACK LEARNING <b>✳</b> PROBLEM SOLVING <b>✳</b> BUILDING IN PUBLIC <b>✳</b> FRONTEND DEVELOPMENT <b>✳</b> FULL-STACK LEARNING <b>✳</b></div></div>

      <section className="section wrap" id="about">
        <SectionTitle number="01" eyebrow="ABOUT ME" title="A developer in progress." muted="Focused on meaningful progress."/>
        <div className="about-grid"><p className="about-big">{profile.about[0]}</p><div className="about-detail">{profile.about.slice(1).map(paragraph => <p key={paragraph}>{paragraph}</p>)}<div className="socials">{socialProfiles.map(({ name, url, icon: Icon }) => <a key={name} href={url} target="_blank" rel="noopener noreferrer"><Icon size={16}/> {name} <ArrowUpRight size={13}/></a>)}</div></div></div>
      </section>

      <section className="section wrap" id="skills">
        <SectionTitle number="02" eyebrow="TECHNICAL SKILLS" title="The tools behind" muted="what I build."/>
        <div className="skill-grid">{skills.map((skill, i) => {const Icon = skill.icon; return <article className="skill-card" key={skill.title}><div className="skill-top"><Icon/><span>0{i+1}</span></div><h3>{skill.title}</h3><p>{skill.text}</p><div className="tags">{skill.tags.map(tag => <span key={tag}>{tag}</span>)}</div></article>})}</div>
      </section>

      <section className="section wrap" id="projects">
        <SectionTitle number="03" eyebrow="SELECTED WORK" title="Built with curiosity." muted="Improved with every iteration."/>
        <ProjectsSection/>
      </section>

      <section className="section wrap" id="experience">
        <SectionTitle number="04" eyebrow="EXPERIENCE" title="Learning through" muted="hands-on experience."/>
        <div className="experience-list">{profile.experience.length > 0 ? profile.experience.map(item => {
          const dateRange = item.startDate && item.endDate
            ? `${item.startDate} – ${item.endDate}`
            : item.startDate || item.endDate;
          return <article className="experience-card" key={item.organization}>
            <div className="experience-heading"><div><h3>{item.organization}</h3>{item.position && <p>{item.position}</p>}</div>{dateRange && <span>{dateRange}</span>}</div>
            {item.description
              ? <p className="experience-description">{item.description}</p>
              : <p className="muted-text">Role, responsibilities and dates will be added when confirmed.</p>}
          </article>;
        }) : <p className="muted-text">Experience details will be shared here when available.</p>}</div>
      </section>

      <section className="section wrap" id="education">
        <SectionTitle number="05" eyebrow="EDUCATION" title="Building strong" muted="foundations."/>
        <div className="education-list">{profile.education.map((degree, index) => <article className="education-card" key={degree.degree}>
          <div className="education-heading">
            <div><h3>{degree.degree}</h3><span className={`education-status${degree.status === 'Completed' ? ' completed' : ''}`}>{degree.status}</span></div>
            <span className="education-period">{degree.period}</span>
          </div>
          <p className="education-institution">{degree.institution}</p>
          {degree.university && <p className="education-university">{degree.university}</p>}
          {degree.cgpa && <p className="education-cgpa">CGPA <strong>{degree.cgpa}</strong></p>}
        </article>)}</div>
      </section>

      <section className="section wrap" id="certifications">
        <SectionTitle number="06" eyebrow="CERTIFICATES & ACHIEVEMENTS" title="Proof of learning" muted="and opportunities earned."/>
        {certificates.length > 0
          ? <div className="certificate-grid">{certificates.map(certificate => <article className="certificate-card" key={certificate.fileUrl}>
            <div className="certificate-card-top"><span className="certificate-icon"><Award size={21}/></span><span className="certificate-label">VERIFIED CERTIFICATE</span></div>
            <h3>{certificate.title}</h3>
            <p className="certificate-issuer">{certificate.issuer}</p>
            <p className="certificate-description">{certificate.description}</p>
            <div className="tags">{certificate.skills.map(skill => <span key={skill}>{skill}</span>)}</div>
            <div className="certificate-footer"><time>{certificate.issuedOn}</time><a className="button secondary" href={certificate.fileUrl} target="_blank" rel="noopener noreferrer">View certificate <ArrowUpRight size={15}/></a></div>
          </article>)}</div>
          : <div className="empty-feature-card"><Award size={25}/><h3>No verified certificates yet</h3><p>Certificates will appear here after they have been added.</p></div>}
      </section>

      <section className="section wrap" id="github">
        <SectionTitle number="07" eyebrow="GITHUB INTEGRATION" title="What I'm building" muted="and sharing on GitHub."/>
        <GitHubSection/>
      </section>

      <section className="section wrap" id="coding-profiles">
        <SectionTitle number="08" eyebrow="CODING PROFILES" title="Practice, one problem" muted="at a time."/>
        <div className="coding-profile-grid">{codingProfiles.map(({ name, url, icon: Icon }) => <a className="coding-profile-card profile-link-card" key={name} href={url} target="_blank" rel="noopener noreferrer"><span className="profile-link-icon"><Icon size={21}/></span><h3>{name}</h3><p>View coding profile <ArrowUpRight size={14}/></p></a>)}</div>
      </section>

      <section className="section wrap" id="professional-profiles">
        <SectionTitle number="09" eyebrow="PROFESSIONAL PROFILES" title="Connect and" muted="work together."/>
        <div className="professional-profile-grid">{professionalProfiles.map(({ name, url, description, icon: Icon }) => <a className="professional-profile-card profile-link-card" key={name} href={url} target="_blank" rel="noopener noreferrer"><span className="profile-link-icon"><Icon size={22}/></span><span className="professional-profile-copy"><strong>{name}</strong><small>{description}</small></span><ArrowUpRight className="profile-link-arrow" size={17}/></a>)}</div>
      </section>

      <section className="section wrap" id="services">
        <SectionTitle number="10" eyebrow="WHAT I DO" title="From useful ideas" muted="to useful software."/>
        <div className="services-grid">{services.map((service, index) => <article className="service-card" key={service.title}><span>0{index + 1}</span><h3>{service.title}</h3><p>{service.text}</p></article>)}</div>
      </section>

      <section className="section wrap" id="blog">
        <SectionTitle number="11" eyebrow="BLOG & TECHNICAL ARTICLES" title="Notes from the" muted="learning journey."/>
        <div className="article-grid">{articles.map((article, index) => <article className="article-card" key={article.title}>
          <div className="article-card-heading"><span className="article-icon"><BookOpen size={19}/></span><span className="article-number">ARTICLE 0{index + 1}</span></div>
          <h3>{article.title}</h3>
          <div className="article-body">
            {article.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
            {article.motto && <p className="article-motto"><strong>{article.motto}</strong></p>}
            {article.closing && <p>{article.closing}</p>}
            {article.signoff && <p className="article-signoff"><em>{article.signoff}</em></p>}
          </div>
        </article>)}</div>
      </section>

      <section className="section wrap" id="resume">
        <SectionTitle number="12" eyebrow="RESUME" title="Interested in my" muted="experience?"/>
        <ResumeSection resume={resume} loading={resumeLoading} error={resumeError}/>
      </section>

      <section className="section wrap testimonials-section" id="testimonials">
        <SectionTitle number="13" eyebrow="TESTIMONIALS" title="Thoughtful feedback," muted="shared with permission."/>
        <div className="feedback-invitation">
          <span className="feedback-icon"><HeartHandshake size={24}/></span>
          <div><h3>Have we worked together?</h3><p>I’m grateful to everyone I’ve learned and collaborated with. If you’d like to share feedback about our work, I’d love to hear from you. Testimonials are published only with permission.</p></div>
          <a className="button secondary" href="mailto:tiwarihariom211@gmail.com?subject=Portfolio%20feedback">Share feedback <ArrowUpRight size={15}/></a>
        </div>
      </section>

      <section className="section wrap analytics-section" id="analytics">
        <SectionTitle number="14" eyebrow="WEBSITE ANALYTICS" title="Useful insights," muted="respectful by design."/>
        <div className="analytics-card"><div><p className="eyebrow">YOUR PRIVACY COMES FIRST</p><h3>Anonymous, opt-in measurement</h3><p>With your permission, this site counts unique visitors and the portfolio sections they view. It stores a random browser ID and section names only—never your IP address. Analytics summaries are visible only to the site administrator.</p>
          <p className="analytics-choice" role="status">{analyticsConsent === true ? 'Analytics are enabled for this browser.' : analyticsConsent === false ? 'Analytics are disabled for this browser.' : 'No analytics preference has been saved.'}</p>
          {analyticsError && <p className="notice" role="alert">{analyticsError}</p>}
        </div><button className="button secondary" onClick={() => setAnalyticsPromptOpen(true)}>Change preferences</button></div>
      </section>

      <section className="contact-section" id="contact"><div className="wrap contact-wrap">
        <div><SectionTitle number="15" eyebrow="GET IN TOUCH" title="Have an idea?" muted="Let's build something useful."/><p className="contact-lede">I'm open to internship opportunities, collaborations, feedback, and conversations about technology.</p>
          <div className="socials contact-links"><a className="email-link" href="mailto:tiwarihariom211@gmail.com"><Mail size={16}/> tiwarihariom211@gmail.com <ArrowUpRight size={16}/></a>{socialProfiles.map(({ name, url, icon: Icon }) => <a key={name} href={url} target="_blank" rel="noopener noreferrer"><Icon size={16}/> {name} <ArrowUpRight size={13}/></a>)}<span className="location-label"><MapPin size={15}/> India</span></div>
        </div>
        <ContactForm/>
      </div></section>
    </main>

    <footer className="footer wrap" id="footer">
      <div className="footer-top"><a className="brand" href="#home"><span className="brand-icon">H</span> hariom<span className="accent">.</span></a><span>Designed & built by Hariom Tiwari · {new Date().getFullYear()}</span><a href="#home">BACK TO TOP ↑</a></div>
      <nav className="footer-navigation" aria-label="Footer navigation">
        {Object.entries(sectionLabels).map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}
        <button className="footer-preferences" onClick={openAnalyticsPreferences}>Analytics preferences</button>
      </nav>
      <nav className="footer-socials" aria-label="Social profiles">
        {socialProfiles.map(({ name, url, icon: Icon }) => <a key={name} href={url} target="_blank" rel="noopener noreferrer" aria-label={name} title={name}><Icon size={17}/></a>)}
      </nav>
    </footer>
    <AnalyticsConsent open={analyticsPromptOpen} onChoose={chooseAnalytics}/>
  </>;
}
