import { useState } from "react";
import "./App.css";

function App() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Validate standard email format
  const isValidEmail = (val) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
  };

  // Format GitHub ISO date to a friendly "Joined Month Year"
  const formatJoinedDate = (isoString) => {
    if (!isoString) return "";
    try {
      const date = new Date(isoString);
      return `Joined ${date.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      })}`;
    } catch {
      return "";
    }
  };

  // Get programming language color dot
  const getLanguageColor = (lang) => {
    const colors = {
      JavaScript: "#f1e05a",
      TypeScript: "#3178c6",
      Python: "#3572A5",
      HTML: "#e34c26",
      CSS: "#563d7c",
      Java: "#b07219",
      "C++": "#f34b7d",
      C: "#555555",
      "C#": "#178600",
      Go: "#00ADD8",
      Rust: "#dea584",
      PHP: "#4F5D95",
      Ruby: "#701516",
      Swift: "#F05138",
      Kotlin: "#A97BFF",
      Dart: "#00B4AB",
      Shell: "#89e051",
    };
    return colors[lang] || "#8b949e";
  };

  const handleSearch = async (e) => {
    if (e) e.preventDefault();

    const trimmedEmail = email.trim();
    const trimmedUser = username.trim();

    // 1. Validation checks
    if (!trimmedEmail) {
      setError("Please enter your email address.");
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      setError("Please enter a valid email address (e.g. user@example.com).");
      return;
    }

    if (!trimmedUser) {
      setError("Please enter a GitHub username.");
      return;
    }

    setLoading(true);
    setError("");
    setProfile(null);

    // API URL resolution:
    // Respects VITE_API_URL environment variable or defaults to backend on port 8000
    const rawApiUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
    const baseUrl = rawApiUrl.replace(/\/+$/, "");

    try {
      const response = await fetch(
        `${baseUrl}/api/search?email=${encodeURIComponent(
          trimmedEmail
        )}&github_username=${encodeURIComponent(trimmedUser)}`,
        {
          headers: {
            Accept: "application/json",
          },
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("GitHub profile not found.");
        } else if (response.status === 429) {
          throw new Error("GitHub API rate limit reached. Please try again later.");
        } else {
          throw new Error(data.detail || "Failed to retrieve GitHub profile.");
        }
      }

      if (!data.github) {
        throw new Error("GitHub profile not found.");
      }

      setProfile(data);
    } catch (err) {
      console.error("Search error:", err);
      if (err.message && !err.message.includes("Failed to fetch") && !err.message.includes("NetworkError")) {
        setError(err.message);
      } else {
        setError(
          "Unable to connect to the backend. Please check that the backend server is running and accessible."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // Quick preset loader for convenient testing
  const loadPreset = (presetUser) => {
    if (!email) {
      setEmail("demo@profilelens.dev");
    }
    setUsername(presetUser);
  };

  return (
    <div className="app">
      {/* BACKGROUND ACCENTS */}
      <div className="bg-glow top-glow"></div>
      <div className="bg-glow bottom-glow"></div>

      {/* HEADER / HERO */}
      <header className="hero">
        <div className="hero-badge">
          <span className="pulse-dot"></span> ProfileLens Intelligence
        </div>
        <div className="hero-icon">🔎</div>
        <h1>
          Profile<span>Lens</span>
        </h1>
        <p>Discover public professional profiles in one place</p>
      </header>

      {/* SEARCH CARD */}
      <section className="search-card">
        <form onSubmit={handleSearch} noValidate>
          <div className="input-group">
            <label htmlFor="email-input">
              Email Address <span className="required-star">*</span>
            </label>
            <input
              id="email-input"
              type="email"
              value={email}
              placeholder="e.g. alex@example.com"
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError("");
              }}
              autoComplete="email"
            />
          </div>

          <div className="input-group">
            <label htmlFor="username-input">
              GitHub Username <span className="required-star">*</span>
            </label>
            <input
              id="username-input"
              type="text"
              value={username}
              placeholder="e.g. octocat"
              onChange={(e) => {
                setUsername(e.target.value);
                if (error) setError("");
              }}
              autoCapitalize="none"
              autoComplete="off"
            />
          </div>

          {/* Quick preset suggestions */}
          <div className="presets-row">
            <span className="presets-label">Popular searches:</span>
            <button
              type="button"
              className="preset-btn"
              onClick={() => loadPreset("octocat")}
            >
              @octocat
            </button>
            <button
              type="button"
              className="preset-btn"
              onClick={() => loadPreset("torvalds")}
            >
              @torvalds
            </button>
            <button
              type="button"
              className="preset-btn"
              onClick={() => loadPreset("gaearon")}
            >
              @gaearon
            </button>
          </div>

          <button
            type="submit"
            className="search-button"
            disabled={loading}
          >
            {loading ? (
              <span className="btn-content">
                <span className="btn-spinner"></span> Searching...
              </span>
            ) : (
              "Search Profile"
            )}
          </button>
        </form>
      </section>

      {/* LOADING STATE */}
      {loading && (
        <div className="loading-box" role="status" aria-live="polite">
          <div className="spinner"></div>
          <p>Fetching public GitHub profile and repositories...</p>
        </div>
      )}

      {/* ERROR MESSAGE */}
      {error && !loading && (
        <div className="error-box" role="alert">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* PROFILE RESULTS */}
      {profile && !loading && (
        <main className="profile-container">
          {/* MAIN PROFILE CARD */}
          <section className="profile-card">
            <div className="profile-top">
              <div className="avatar-wrapper">
                <img
                  className="avatar"
                  src={profile.github.avatar_url}
                  alt={profile.github.name || profile.github.username}
                  loading="lazy"
                />
              </div>

              <h2>{profile.github.name || profile.github.username}</h2>
              <div className="username">@{profile.github.username}</div>

              {profile.github.bio && (
                <p className="bio">{profile.github.bio}</p>
              )}
            </div>

            {/* PROFILE DETAILS (Location, Company, Website, Joined) */}
            <div className="profile-details">
              {profile.github.location && (
                <div className="detail">
                  <span className="detail-icon">📍</span>
                  <span>{profile.github.location}</span>
                </div>
              )}

              {profile.github.company && (
                <div className="detail">
                  <span className="detail-icon">🏢</span>
                  <span>{profile.github.company}</span>
                </div>
              )}

              {profile.github.blog && (
                <div className="detail">
                  <span className="detail-icon">🔗</span>
                  <a
                    href={
                      profile.github.blog.startsWith("http")
                        ? profile.github.blog
                        : `https://${profile.github.blog}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {profile.github.blog.replace(/^https?:\/\//, "")}
                  </a>
                </div>
              )}

              {profile.github.created_at && (
                <div className="detail">
                  <span className="detail-icon">📅</span>
                  <span>{formatJoinedDate(profile.github.created_at)}</span>
                </div>
              )}

              {profile.github.twitter_username && (
                <div className="detail">
                  <span className="detail-icon">🐦</span>
                  <a
                    href={`https://twitter.com/${profile.github.twitter_username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    @{profile.github.twitter_username}
                  </a>
                </div>
              )}
            </div>

            {/* STATISTICS ROW */}
            <div className="stats">
              <div className="stat">
                <strong>
                  {Number(profile.github.public_repositories || 0).toLocaleString()}
                </strong>
                <span>Repositories</span>
              </div>

              <div className="stat">
                <strong>
                  {Number(profile.github.followers || 0).toLocaleString()}
                </strong>
                <span>Followers</span>
              </div>

              <div className="stat">
                <strong>
                  {Number(profile.github.following || 0).toLocaleString()}
                </strong>
                <span>Following</span>
              </div>
            </div>

            {/* ACTIONS */}
            <div className="profile-actions">
              {profile.github.profile && (
                <a
                  className="profile-button primary"
                  href={profile.github.profile}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View GitHub Profile ↗
                </a>
              )}
              {profile.github.blog && (
                <a
                  className="profile-button secondary"
                  href={
                    profile.github.blog.startsWith("http")
                      ? profile.github.blog
                      : `https://${profile.github.blog}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Visit Website ↗
                </a>
              )}
            </div>
          </section>

          {/* REPOSITORIES SECTION */}
          {profile.github.repositories &&
            profile.github.repositories.length > 0 && (
              <section className="repositories-section">
                <div className="section-header">
                  <h3 className="section-title">Latest Repositories</h3>
                  <span className="section-subtitle">
                    Most recently active open-source projects
                  </span>
                </div>

                <div className="repository-grid">
                  {profile.github.repositories.map((repo, index) => (
                    <div
                      className="repository-card"
                      key={`${repo.name}-${index}`}
                    >
                      <div className="repo-header">
                        <h4>{repo.name}</h4>
                        {repo.language && (
                          <span className="lang-pill">
                            <span
                              className="lang-dot"
                              style={{
                                backgroundColor: getLanguageColor(repo.language),
                              }}
                            ></span>
                            {repo.language}
                          </span>
                        )}
                      </div>

                      <p>
                        {repo.description || "No description provided for this repository."}
                      </p>

                      <div className="repo-footer">
                        <div className="repo-stats">
                          <span title="Stars count">
                            ⭐ {repo.stars ?? 0}
                          </span>
                          <span title="Forks count">
                            🍴 {repo.forks ?? 0}
                          </span>
                        </div>

                        {repo.html_url && (
                          <a
                            href={repo.html_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="repo-link"
                          >
                            Explore ↗
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
        </main>
      )}

      {/* FOOTER */}
      <footer>
        <p>ProfileLens • GitHub Profile Discovery • Built for Developers</p>
      </footer>
    </div>
  );
}

export default App;