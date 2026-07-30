"use client";

// ==========================================
// 1. REACT & NEXT.JS CORE IMPORTS
// ==========================================
import { useState, useEffect } from "react";

// ==========================================
// 2. CUSTOM COMPONENTS / MODULES IMPORTS
//    ---> PASTE NEW COMPONENT IMPORTS HERE <---
// ==========================================
import ThemeSwitcher from "./ThemeSwitcher";
import Globe from "./Globe"; // 3D Canvas Background Globe Component

// ==========================================
// 3. STATIC / PROFILE DATA CONFIGURATION
// ==========================================
const PROFILE = {
  name: "Melissa Tiubin Munang",
  title: "Software Engineer & System Builder",
  bio: "Final-year university student building modern mobile architectures and custom server environments. Proficient in Dart/Flutter, systems optimization, and shell automation.",
  links: {
    github: "https://github.com/danz-the-penguin",
    linkedin: "https://linkedin.com/in/melissatiubinmunang",
    email: "danzthepenguin@gmail.com",
  },
};

const PROJECTS = [
  {
    title: "Smart Garden Planner",
    description:
      "A cross-platform mobile application engineered with Flutter and Dart. Integrates a highly optimized local SQLite database architecture for local data persistence and offline state synchronization.",
    tags: ["Flutter", "Dart", "SQLite", "OOP"],
    link: "https://github.com/danz-the-penguin/smart-garden-planner",
  },
  {
    title: "Debian Home Server Infrastructure",
    description:
      "Provisioned and configured a local Debian-based environment running containerized network services via Docker. Automated system sleep states, power management cycles, and network-level ad blocking.",
    tags: ["Debian", "Docker", "Pi-hole"],
    link: "#",
  },
  {
    title: "Invoice Management System",
    description:
      "Collaborated on a full-stack PHP & MySQL web application to automate billing cycles. Integrated a GitHub Actions CI/CD pipeline for automated PHPUnit testing and resolved security and code maintainability issues flagged by SonarQube analytics.",
    tags: ["PHP", "MySQL", "PHPUnit", "CI/CD", "SonarQube", "Composer"],
    link: "https://github.com/danz-the-penguin/InvoiceManagementSystem",
  },
  {
    title: "Zoo Management System",
    description:
      "Developed a dynamic full-stack database application managing animal records and administrative tracking. Built the relational database modeling, custom SQL schemas, and backend server-side scripting scripts to handle data input.",
    tags: ["PHP", "MySQL", "JavaScript", "Database Modeling", "SQL"],
    link: "https://github.com/danz-the-penguin/ZooManagementSystem",
  },
  {
    title: "CLI Media Archiving Utilities",
    description:
      "Designed custom scripting configurations optimized for the Fish shell environment to streamline automated media archival, metadata organization, and system directory parsing.",
    tags: ["Fish Shell", "Python", "CLI Tools", "Automation"],
    link: "#",
  },
  {
    title: "idk?",
    description:
      "Designed custom scripting configurations optimized for the Fish shell environment to streamline automated media archival, metadata organization, and system directory parsing.",
    tags: ["Fish Shell", "Python", "CLI Tools", "Automation"],
    link: "#",
  },
];

const EXPERIENCE = [
  {
    role: "Final Year Graduation Project",
    company: "University Initiative",
    period: "2026 - Present",
    description:
      "Designing the full technical layout, Data Flow Diagrams (DFDs), and system architecture schemas for an experimental cross-platform marketplace solution.",
  },
  {
    role: "Systems & Electronics Hobbyist",
    company: "Self-Directed",
    period: "2025 - 2026",
    description:
      "Managing hardware maintenance, configuring local media hosting engines, and deploying production layouts to distributed CDN networks like Vercel.",
  },
];

// ==========================================
// 4. SUB-COMPONENTS (e.g., Cards, Badges, Lists)
// ==========================================
function ProjectCard({ project }) {
  const [isHovered, setIsHovered] = useState(false);
  const hasLink = project.link && project.link !== "#";

  const cardStyle = {
    ...styles.projectCard,
    transform: isHovered && hasLink ? "translateY(-4px)" : "none",
    borderColor: isHovered && hasLink ? "var(--accent)" : "var(--border-color)",
    boxShadow:
      isHovered && hasLink
        ? "0 8px 24px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.1)"
        : styles.projectCard.boxShadow,
    cursor: hasLink ? "pointer" : "default",
  };

  const arrowStyle = {
    ...styles.linkArrow,
    transform: isHovered ? "translate(2px, -2px)" : "none",
  };

  const cardContent = (
    <div
      style={cardStyle}
      onMouseEnter={() => hasLink && setIsHovered(true)}
      onMouseLeave={() => hasLink && setIsHovered(false)}
    >
      <h3 style={styles.projectTitle}>
        {project.title} {hasLink && <span style={arrowStyle}>↗</span>}
      </h3>
      <p style={styles.projectDescription}>{project.description}</p>
      <div style={styles.tagContainer}>
        {project.tags.map((tag, tIndex) => (
          <span key={tIndex} style={styles.tag}>
            {tag}
          </span>
        ))}
      </div>
    </div>
  );

  // If there's a valid link, wrap it in an anchor tag. Otherwise, render just the card box.
  if (hasLink) {
    return (
      <a
        href={project.link}
        target="_blank"
        rel="noopener noreferrer"
        style={styles.projectCardLink}
      >
        {cardContent}
      </a>
    );
  }

  return cardContent;
}
// ==========================================
// 5. MAIN PAGE COMPONENT
// ==========================================
export default function Home() {
  // 1. Default to checking document attribute or media preference immediately
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const checkMode = () => {
      const mode = document.documentElement.getAttribute("data-mode");
      // If data-mode is explicitly set to "light", set isDark to false
      setIsDark(mode !== "light");
    };

    // Run immediately on mount
    checkMode();

    const observer = new MutationObserver(checkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-mode"],
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div style={styles.container}>
      {/* 
        ----------------------------------------------------
        BACKGROUND MODULES (e.g. 3D Globe, Canvas, Particles)
        ----------------------------------------------------
        Positioned first so it mounts behind the UI content.
      */}
      <Globe isDark={isDark} />

      {/* 
        ----------------------------------------------------
        HEADER & THEME CONTROLS
        ----------------------------------------------------
      */}
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
          <a href={PROFILE.links.email} style={styles.link}>
            Contact Email
          </a>
        </div>
      </header>

      <hr style={styles.divider} />

      {/* 
        ----------------------------------------------------
        ABOUT SECTION
        ----------------------------------------------------
      */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>About Me</h2>
        <p style={styles.bio}>{PROFILE.bio}</p>
      </section>

      {/* 
        ----------------------------------------------------
        PROJECTS GRID SECTION
        ----------------------------------------------------
      */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Side Projects</h2>
        <div style={styles.projectGrid}>
          {PROJECTS.map((project, index) => (
            <ProjectCard key={index} project={project} />
          ))}
        </div>
      </section>

      {/* 
        ----------------------------------------------------
        EXPERIENCE / TIMELINE SECTION
        ----------------------------------------------------
      */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Experience</h2>
        <div style={styles.timeline}>
          {EXPERIENCE.map((exp, index) => (
            <div key={index} style={styles.timelineItem}>
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
            </div>
          ))}
        </div>
      </section>

      {/* 
        ----------------------------------------------------
        FOOTER SECTION
        ----------------------------------------------------
      */}
      <footer style={styles.footer}>
        <p>
          © {new Date().getFullYear()} {PROFILE.name}. Built with Next.js &
          hosted on Vercel.
        </p>
      </footer>
    </div>
  );
}

// ==========================================
// 6. INLINE CSS-IN-JS STYLES OBJECT
// ==========================================
const styles = {
  container: {
    position: "relative",
    zIndex: 1, // Main container floats above zIndex: 0 globe
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
    gap: "16px",
  },
  link: {
    color: "var(--accent)",
    textDecoration: "none",
    fontWeight: "600",
    fontSize: "0.95rem",
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
  bio: {
    color: "var(--text-main)",
    fontSize: "1rem",
    fontWeight: "300",
  },
  projectGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "16px",
  },
  projectCardLink: {
    textDecoration: "none",
    color: "inherit",
    display: "block",
  },
  projectCard: {
    position: "relative",
    zIndex: 2, // Explicitly places individual cards on top
    height: "100%",
    border: "1px solid var(--border-color)",
    borderRadius: "8px",
    padding: "20px",
    backgroundColor: "var(--bg-card)",
    boxShadow:
      "0 4px 12px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
    transition: "all 0.2s ease-in-out",
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
    transition: "transform 0.2s ease-in-out",
    display: "inline-block",
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
    gap: "18px",
  },
  timelineItem: {
    borderLeft: "2px solid var(--border-color)",
    paddingLeft: "16px",
  },
  timelineHeader: {
    display: "flex",
    justifyContent: "space-between",
    flexWrap: "wrap",
    fontSize: "0.95rem",
    marginBottom: "4px",
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
};
