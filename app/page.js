"use client";

// ==========================================
// 1. REACT & NEXT.JS CORE IMPORTS
// ==========================================
import { useState, useEffect } from "react";

// ==========================================
// 2. CUSTOM COMPONENTS / MODULES IMPORTS
// ==========================================
import ThemeSwitcher from "./components/ThemeSwitcher";
import Globe from "./components/Globe"; // 3D Canvas Background Globe Component

// ==========================================
// 3. STATIC / PROFILE DATA CONFIGURATION
// ==========================================
const PROFILE = {
  name: "Melissa Tiubin Munang",
  title: "Software Engineer & Systems Enthusiast",
  bio: "Final-year Computer Science student with a strong foundation in cross-platform development, systems administration, and workflow automation. Driven by curiosity and a desire to build reliable software, from Flutter mobile applications to containerized local servers. Passionate about learning modern engineering patterns and continuously expanding technical depth.",
  links: {
    github: "https://github.com/danz-the-penguin",
    linkedin: "https://linkedin.com/in/melissatiubinmunang",
    email: "danzthepenguinz@gmail.com",
    techResume: "/techresume.pdf",
    nonTechResume: "/nontechresume.pdf",
  },
};

const PROJECTS = [
  {
    title: "Smart Garden Planner",
    description:
      "Cross-platform mobile application built with Flutter and Dart. Designed a local SQLite database setup to ensure efficient offline data storage and smooth local query execution.",
    tags: ["Flutter", "Dart", "SQLite", "OOP Architecture"],
    link: "https://github.com/danz-the-penguin/smart-garden-planner",
  },
  {
    title: "Debian Server Setup & Homelab",
    description:
      "Configured and maintained a headless Debian environment to host containerized network services via Docker. Implemented automated power management scripts, DNS filtration, and routine backups to learn practical systems administration.",
    tags: ["Debian", "Linux", "Docker", "Pi-hole", "Networking"],
    link: "#",
  },
  {
    title: "Invoice Management System",
    description:
      "Collaborated on a full-stack PHP & MySQL web application for managing invoices. Set up GitHub Actions CI/CD workflows for automated unit testing and used SonarQube to identify and fix code quality issues.",
    tags: ["PHP", "MySQL", "PHPUnit", "CI/CD", "SonarQube", "Composer"],
    link: "https://github.com/danz-the-penguin/InvoiceManagementSystem",
  },
  {
    title: "Zoo Management System",
    description:
      "Full-stack database management application for record tracking. Designed normalized relational database schemas (3NF) and wrote SQL routines for data consistency.",
    tags: ["PHP", "MySQL", "JavaScript", "Relational Databases", "SQL"],
    link: "https://github.com/danz-the-penguin/ZooManagementSystem",
  },
  {
    title: "CLI & Workflow Automation Scripts",
    description:
      "Built custom command-line utilities and Fish Shell configurations paired with Python scripts to streamline file management, media parsing, and repetitive system tasks.",
    tags: ["Fish Shell", "Python", "CLI Tooling", "Automation"],
    link: "#",
  },
];

const EXPERIENCE = [
  {
    role: "Student Developer — Final Year Project",
    company: "University Project",
    period: "2026 – Present",
    description:
      "Designing and implementing a distributed marketplace application. Responsibilities include mapping application data flows (DFDs), designing database schemas, and building out cross-platform user workflows.",
  },
  {
    role: "Self-Directed Systems & Hardware Projects",
    company: "Independent Learning",
    period: "2024 – Present",
    description:
      "Exploring practical IT concepts outside class by configuring local media servers, fine-tuning Linux terminal environments, and troubleshooting hardware maintenance.",
  },
];

// ==========================================
// 4. REUSABLE HOVER CARD & BUTTON SUB-COMPONENTS
// ==========================================
function InteractiveCard({ children, style, link, isProjectCard = false }) {
  const [isHovered, setIsHovered] = useState(false);
  const hasLink = link && link !== "#";

  const cardStyle = {
    ...styles.cardBase,
    ...(isProjectCard ? styles.projectCardBase : {}),
    ...style,
    transform: isHovered ? "translateY(-4px)" : "none",
    borderColor: isHovered ? "var(--accent)" : "var(--border-color)",
    boxShadow: isHovered
      ? "0 8px 24px rgba(0, 0, 0, 0.25), 0 0 0 1px var(--accent)"
      : styles.cardBase.boxShadow,
    cursor: hasLink ? "pointer" : "default",
  };

  const content = (
    <div
      style={cardStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
    </div>
  );

  if (hasLink) {
    return (
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        style={styles.cardLinkWrapper}
      >
        {content}
      </a>
    );
  }

  return content;
}

function ProjectCard({ project }) {
  const hasLink = project.link && project.link !== "#";

  return (
    <InteractiveCard link={project.link} isProjectCard={true}>
      <h3 style={styles.projectTitle}>
        {project.title} {hasLink && <span style={styles.linkArrow}>↗</span>}
      </h3>
      <p style={styles.projectDescription}>{project.description}</p>
      <div style={styles.tagContainer}>
        {project.tags.map((tag, tIndex) => (
          <span key={tIndex} style={styles.tag}>
            {tag}
          </span>
        ))}
      </div>
    </InteractiveCard>
  );
}

function ResumeButton({ href, label }) {
  const [isHovered, setIsHovered] = useState(false);

  const btnStyle = {
    ...styles.resumeBtn,
    transform: isHovered ? "translateY(-4px)" : "none",
    borderColor: isHovered ? "var(--accent)" : "var(--border-color)",
    boxShadow: isHovered
      ? "0 8px 24px rgba(0, 0, 0, 0.25), 0 0 0 1px var(--accent)"
      : "0 4px 12px rgba(0, 0, 0, 0.12)",
  };

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={btnStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {label}
    </a>
  );
}

// ==========================================
// 5. MAIN PAGE COMPONENT
// ==========================================
export default function Home() {
  const [isDark, setIsDark] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // Copy email handler with 2-second toast display
  const handleCopyEmail = (e) => {
    e.preventDefault();
    const emailAddress = PROFILE.links.email.replace("mailto:", "");

    navigator.clipboard.writeText(emailAddress).then(() => {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    });
  };

  useEffect(() => {
    // 1. Check if user already toggled a preference manually
    const savedTheme = localStorage.getItem("theme");

    if (savedTheme) {
      document.documentElement.setAttribute("data-mode", savedTheme);
      setIsDark(savedTheme === "dark");
    } else {
      // 2. Default to client device preference
      const systemPrefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)",
      ).matches;
      const deviceTheme = systemPrefersDark ? "dark" : "light";

      document.documentElement.setAttribute("data-mode", deviceTheme);
      setIsDark(systemPrefersDark);
    }

    // 3. Keep state synced when ThemeSwitcher updates data-mode attribute
    const checkMode = () => {
      const mode = document.documentElement.getAttribute("data-mode");
      setIsDark(mode === "dark");
    };

    const observer = new MutationObserver(checkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-mode"],
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div style={styles.container}>
      <Globe isDark={isDark} />
      <ThemeSwitcher />

      <header style={styles.header}>
        <h1 style={styles.name}>{PROFILE.name}</h1>
        <p style={styles.title}>{PROFILE.title}</p>
        <div style={styles.links}>
          <a
            href={PROFILE.links.github}
            target="_blank"
            rel="noopener noreferrer"
            style={styles.link}
          >
            GitHub
          </a>
          <a
            href={PROFILE.links.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            style={styles.link}
          >
            LinkedIn
          </a>
          <a
            href={PROFILE.links.email}
            onClick={handleCopyEmail}
            style={styles.link}
            title="Click to copy email address"
          >
            Contact Email
          </a>
          {/* Identical Resume Buttons Matching Card Hover FX */}
          <ResumeButton href={PROFILE.links.techResume} label="Tech Resume ↗" />
          <ResumeButton
            href={PROFILE.links.nonTechResume}
            label="General Resume ↗"
          />
        </div>
      </header>

      <hr style={styles.divider} />

      {/* About Me Section - Bio in a Card */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>About Me</h2>
        <InteractiveCard>
          <p style={styles.bioText}>{PROFILE.bio}</p>
        </InteractiveCard>
      </section>

      {/* Featured Projects Section */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Featured Projects</h2>
        <div style={styles.projectGrid}>
          {PROJECTS.map((project, index) => (
            <ProjectCard key={index} project={project} />
          ))}
        </div>
      </section>

      {/* Experience & Initiatives Section */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Experience & Initiatives</h2>
        <div style={styles.timeline}>
          {EXPERIENCE.map((exp, index) => (
            <InteractiveCard key={index}>
              <div style={styles.timelineHeader}>
                <div>
                  <strong>{exp.role}</strong> —{" "}
                  <span style={{ color: "var(--text-muted)" }}>
                    {exp.company}
                  </span>
                </div>
                <span style={styles.period}>{exp.period}</span>
              </div>
              <p style={styles.expDescription}>{exp.description}</p>
            </InteractiveCard>
          ))}
        </div>
      </section>

      <footer style={styles.footer}>
        <p>© 2026 {PROFILE.name}. Built with Next.js & hosted on Vercel.</p>
      </footer>

      {/* Toast Notification for Clipboard Copy */}
      {showToast && (
        <div style={styles.toast}>✓ Email copied to clipboard!</div>
      )}
    </div>
  );
}

// ==========================================
// 6. INLINE CSS-IN-JS STYLES OBJECT
// ==========================================
const styles = {
  container: {
    position: "relative",
    zIndex: 1,
    maxWidth: "740px",
    margin: "0 auto",
    padding: "40px 20px",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: "var(--text-main)",
    lineHeight: "1.6",
  },
  header: {
    marginBottom: "24px",
  },
  name: {
    fontSize: "2.6rem",
    fontWeight: "800",
    margin: "0 0 6px 0",
    letterSpacing: "-0.02em",
    background: "var(--heading-gradient)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
  },
  title: {
    fontSize: "1.15rem",
    color: "var(--text-muted)",
    margin: "0 0 16px 0",
    fontWeight: "400",
  },
  links: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
  },
  link: {
    color: "var(--accent)",
    textDecoration: "none",
    fontWeight: "600",
    fontSize: "0.95rem",
    cursor: "pointer",
  },
  resumeBtn: {
    color: "var(--text-main)",
    backgroundColor: "var(--bg-card)",
    border: "1px solid var(--border-color)",
    padding: "5px 12px",
    borderRadius: "6px",
    textDecoration: "none",
    fontWeight: "600",
    fontSize: "0.85rem",
    display: "inline-block",
    transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
    cursor: "pointer",
  },
  divider: {
    border: "0",
    height: "1px",
    background:
      "linear-gradient(90deg, transparent, var(--border-color), transparent)",
    margin: "28px 0",
  },
  section: {
    marginBottom: "36px",
  },
  sectionTitle: {
    fontSize: "1.1rem",
    fontWeight: "700",
    marginBottom: "16px",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    background: "var(--heading-gradient)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  cardBase: {
    position: "relative",
    zIndex: 2,
    border: "1px solid var(--border-color)",
    borderRadius: "10px",
    padding: "20px",
    backgroundColor: "var(--bg-card)",
    boxShadow:
      "0 4px 12px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
    transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
    boxSizing: "border-box",
  },
  projectCardBase: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
  },
  cardLinkWrapper: {
    textDecoration: "none",
    color: "inherit",
    display: "block",
    height: "100%",
  },
  bioText: {
    margin: 0,
    fontSize: "0.98rem",
    color: "var(--text-main)",
    fontWeight: "350",
    lineHeight: "1.65",
  },
  projectGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "16px",
    alignItems: "stretch",
  },
  projectTitle: {
    margin: "0 0 8px 0",
    fontSize: "1.15rem",
    fontWeight: "600",
    color: "var(--text-main)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  linkArrow: {
    fontSize: "0.9rem",
    color: "var(--accent)",
  },
  projectDescription: {
    fontSize: "0.9rem",
    color: "var(--text-muted)",
    margin: "0 0 14px 0",
  },
  tagContainer: {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
    marginTop: "auto",
  },
  tag: {
    fontSize: "0.7rem",
    backgroundColor: "var(--tag-bg)",
    border: "1px solid var(--tag-border)",
    padding: "3px 8px",
    borderRadius: "4px",
    fontWeight: "600",
    color: "var(--text-main)",
    textTransform: "uppercase",
    letterSpacing: "0.03em",
  },
  timeline: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  timelineHeader: {
    display: "flex",
    justifyContent: "space-between",
    flexWrap: "wrap",
    fontSize: "0.95rem",
    marginBottom: "6px",
    color: "var(--text-main)",
  },
  period: {
    color: "var(--text-muted)",
    fontSize: "0.85rem",
  },
  expDescription: {
    margin: "0",
    fontSize: "0.9rem",
    color: "var(--text-muted)",
  },
  footer: {
    marginTop: "50px",
    textAlign: "center",
    fontSize: "0.8rem",
    color: "var(--text-muted)",
    borderTop: "1px solid var(--border-color)",
    paddingTop: "20px",
  },
  toast: {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    zIndex: 1000,
    backgroundColor: "var(--accent)",
    color: "#ffffff",
    padding: "10px 18px",
    borderRadius: "8px",
    fontSize: "0.88rem",
    fontWeight: "600",
    boxShadow: "0 6px 20px rgba(0, 0, 0, 0.25)",
    transition: "all 0.2s ease-in-out",
  },
};
