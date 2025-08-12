import React, { useState } from "react";
import "./App.css";

function App() {
  const [domain, setDomain] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const response = await fetch(
        `/check?domain=${encodeURIComponent(domain)}`
      );
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err.message || "Error fetching data");
    } finally {
      setLoading(false);
    }
  };

  const renderDkimSelectors = (dkimData) => {
    if (!dkimData) return "Not found";

    // Backwards compatibility:
    // If backend returns a single selector string, display it.
    if (typeof dkimData.selector === "string") {
      return `selector: ${dkimData.selector}`;
    }

    // If backend returns an array of selectors, list them
    if (Array.isArray(dkimData.selectors)) {
      return (
        <ul>
          {dkimData.selectors.map((sel, idx) => (
            <li key={idx}>selector: {sel}</li>
          ))}
        </ul>
      );
    }

    return "Invalid DKIM data";
  };

  return (
    <div className="App">
      <h1>Domain Auth Checker</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="Enter domain"
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? "Checking..." : "Check"}
        </button>
      </form>

      {error && <div className="error">Error: {error}</div>}

      {data && (
        <div className="results">
          <h2>Results for {domain}</h2>

          <div className="result-section">
            <h3>SPF</h3>
            <pre>{data.spf || "Not found"}</pre>
          </div>

          <div className="result-section">
            <h3>DKIM</h3>
            {renderDkimSelectors(data.dkim)}
          </div>

          <div className="result-section">
            <h3>Email Relay</h3>
            <pre>{data.email_relay || "Not found"}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
