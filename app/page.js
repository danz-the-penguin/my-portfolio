// Sample Data - Change this text anytime to update your site instantly
const PROFILE = {
  name: "Penguin",
  title: "Software Engineer & System Builder",
  bio: "Final-year university student building modern mobile architectures and custom server environments. Proficient in Dart/Flutter, systems optimization, and shell automation.",
  links: {
    github: "https://github.com/danz-the-penguin",
    linkedin: "https://linkedin.com",
    email: "mailto:your-email@example.com",
  },
};

const PROJECTS = [
  {
    title: "Marketplace Mobile App Prototype",
    description:
      "A cross-platform mobile application engineered with Flutter and Dart. Integrates a highly optimized local SQLite database architecture for local data persistence and offline state synchronization.",
    tags: ["Flutter", "Dart", "SQLite", "OOP"],
    link: "#",
  },
  {
    title: "Debian Home Server Infrastructure",
    description:
      "Provisioned and configured a local Debian-based environment running containerized network services via Docker. Automated system sleep states, power management cycles, and network-level ad blocking.",
    tags: ["Debian", "Docker", "Pi-hole", "Bash Scripting"],
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

export default function Home() {
  return (
    <div style={styles.container}>
      {/* HEADER SECTION */}
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

      {/* ABOUT SECTION */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>About Me</h2>
        <p style={styles.bio}>{PROFILE.bio}</p>
      </section>

      {/* PROJECTS SECTION */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Side Projects</h2>
        <div style={styles.projectGrid}>
          {PROJECTS.map((project, index) => (
            <div key={index} style={styles.projectCard}>
              <h3 style={styles.projectTitle}>{project.title}</h3>
              <p style={styles.projectDescription}>{project.description}</p>
              <div style={styles.tagContainer}>
                {project.tags.map((tag, tIndex) => (
                  <span key={tIndex} style={styles.tag}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* EXPERIENCE SECTION */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Experience</h2>
        <div style={styles.timeline}>
          {EXPERIENCE.map((exp, index) => (
            <div key={index} style={styles.timelineItem}>
              <div style={styles.timelineHeader}>
                <div>
                  <strong>{exp.role}</strong> —{" "}
                  <span style={{ color: "#555" }}>{exp.company}</span>
                </div>
                <span style={styles.period}>{exp.period}</span>
              </div>
              <p style={styles.expDescription}>{exp.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer style={styles.footer}>
        <p>
          © {new Date().getFullYear()} {PROFILE.name}. Built with Next.js &
          hosted on Vercel.
        </p>
      </footer>
    </div>
  );
}

// MINIMALIST COMPACT STYLES (No extra CSS files needed)
const styles = {
  container: {
    maxWidth: "740px",
    margin: "0 auto",
    padding: "40px 20px",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: "#222",
    lineHeight: "1.6",
  },
  header: {
    marginBottom: "24px",
  },
  name: {
    fontSize: "2.4rem",
    fontWeight: "700",
    margin: "0 0 6px 0",
    letterSpacing: "-0.02em",
    color: "#111",
  },
  title: {
    fontSize: "1.15rem",
    color: "#555",
    margin: "0 0 16px 0",
    fontWeight: "400",
  },
  links: {
    display: "flex",
    gap: "16px",
  },
  link: {
    color: "#0070f3",
    textDecoration: "none",
    fontWeight: "500",
    fontSize: "0.95rem",
  },
  divider: {
    border: "0",
    borderTop: "1px solid #eaeaea",
    margin: "28px 0",
  },
  section: {
    marginBottom: "36px",
  },
  sectionTitle: {
    fontSize: "1.4rem",
    fontWeight: "600",
    marginBottom: "14px",
    color: "#111",
    letterSpacing: "-0.01em",
  },
  bio: {
    color: "#333",
    fontSize: "1rem",
  },
  projectGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "16px",
  },
  projectCard: {
    border: "1px solid #eaeaea",
    borderRadius: "6px",
    padding: "18px",
    backgroundColor: "#fafafa",
  },
  projectTitle: {
    margin: "0 0 8px 0",
    fontSize: "1.1rem",
    fontWeight: "600",
    color: "#111",
  },
  projectDescription: {
    fontSize: "0.9rem",
    color: "#444",
    margin: "0 0 14px 0",
  },
  tagContainer: {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
  },
  tag: {
    fontSize: "0.7rem",
    backgroundColor: "#eee",
    padding: "3px 8px",
    borderRadius: "4px",
    fontWeight: "500",
    color: "#444",
  },
  timeline: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },
  timelineItem: {
    borderLeft: "2px solid #eaeaea",
    paddingLeft: "14px",
  },
  timelineHeader: {
    display: "flex",
    justifyContent: "space-between",
    flexWrap: "wrap",
    fontSize: "0.95rem",
    marginBottom: "4px",
  },
  period: {
    color: "#777",
    fontSize: "0.85rem",
  },
  expDescription: {
    margin: "0",
    fontSize: "0.9rem",
    color: "#444",
  },
  footer: {
    marginTop: "50px",
    textAlign: "center",
    fontSize: "0.8rem",
    color: "#777",
  },
};
