import React, { useState } from "react";
import "./App.css";

function App() {
  const [domain, setDomain] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!domain) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err.message || "Failed to check domain");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header>
        <h1>Domain Authentication Checker</h1>
        <p>Verify DNS records and email server configuration</p>
      </header>

      <div className="checker-container">
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value.trim())}
              placeholder="example.com"
              required
            />
            <button type="submit" disabled={loading}>
              {loading ? "Checking..." : "Check Domain"}
            </button>
          </div>
        </form>

        {error && <div className="error">{error}</div>}

        {results && (
          <div className="results">
            <h2>
              Results for: <span className="domain">{domain}</span>
            </h2>

            {/* DNS Results */}
            <div className="dns-results">
              <h3>DNS Authentication</h3>
              <div className="record-grid">
                {Object.entries(results.checks).map(([key, check]) => (
                  <div
                    key={key}
                    className={`record-card ${
                      check.valid ? "valid" : "invalid"
                    }`}
                  >
                    <h4>{key.toUpperCase()}</h4>
                    <div className="record-details">
                      <span>
                        Status:{" "}
                        {check.exists
                          ? check.valid
                            ? "✅ Valid"
                            : "⚠️ Needs Fix"
                          : "❌ Missing"}
                      </span>
                      {check.exists && (
                        <>
                          <div className="record-value">
                            <span>Record:</span>
                            <code>{check.record}</code>
                          </div>
                          {check.selector && (
                            <div className="selector">
                              <span>Selector:</span>
                              <span>{check.selector}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Email Relay Results */}
            {results.email_relay && (
              <div className="relay-results">
                <h3>Email Server Configuration</h3>
                <div className="relay-grid">
                  <div>
                    <h4>MX Records</h4>
                    <ul>
                      {results.email_relay.mx_records?.map((record, i) => (
                        <li key={i}>{record}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4>Connection Tests</h4>
                    <div className="test-results">
                      <span>
                        SMTP Access:{" "}
                        {results.email_relay.smtp_connectivity ? "✅" : "❌"}
                      </span>
                      <span>
                        TLS Support:{" "}
                        {results.email_relay.starttls_supported ? "✅" : "❌"}
                      </span>
                      <span>
                        Open Relay:{" "}
                        {results.email_relay.open_relay
                          ? "⚠️ Vulnerable"
                          : "✅ Secure"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Summary */}
            {results.summary && (
              <div className="summary">
                <h3>Recommendations</h3>
                <p>
                  {results.summary.recommendations ||
                    "All configurations appear correct"}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
