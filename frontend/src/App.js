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

      if (!response.ok) throw new Error(await response.text());

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
        <p>Verify SPF, DKIM, and DMARC records</p>
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
              Results for: <span>{domain}</span>
            </h2>

            <div className="record-sections">
              {Object.entries(results.checks).map(([key, check]) => (
                <div
                  key={key}
                  className={`record-section ${
                    check.valid ? "valid" : "invalid"
                  }`}
                >
                  <h3>{key.toUpperCase()}</h3>
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

            {results.summary && (
              <div className="summary">
                <h3>Recommendations</h3>
                <p>{results.summary.recommendations}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
