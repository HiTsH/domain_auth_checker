import React, { useState } from "react";
import {
  Container,
  TextField,
  Button,
  Typography,
  Paper,
  Grid,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import CheckCircleIcon from "@material-ui/icons/CheckCircle";
import ErrorIcon from "@material-ui/icons/Error";

const useStyles = makeStyles((theme) => ({
  root: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    backgroundColor: "#f5f7fa",
    minHeight: "100vh",
    padding: theme.spacing(4),
  },
  header: {
    marginBottom: theme.spacing(4),
    color: "#2c3e50",
  },
  inputContainer: {
    marginBottom: theme.spacing(4),
    padding: theme.spacing(3),
    backgroundColor: "#ffffff",
    borderRadius: "8px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
  },
  resultCard: {
    padding: theme.spacing(3),
    marginBottom: theme.spacing(2),
    borderRadius: "8px",
  },
  success: { color: "#4caf50" },
  error: { color: "#f44336" },
  chip: { marginRight: theme.spacing(1), marginBottom: theme.spacing(1) },
}));

function EmailRelayResults({ emailRelay, classes }) {
  if (!emailRelay) return null;
  if (emailRelay.error) {
    return (
      <Paper className={classes.resultCard}>
        <Typography>Error checking email relay: {emailRelay.error}</Typography>
      </Paper>
    );
  }

  return (
    <Paper className={useStyles().resultCard}>
      <Typography variant="h6">Email Relay Configuration</Typography>
      <Typography>
        Overall Status:
        <span
          style={{
            color: emailRelay.overall_configured ? "#4caf50" : "#f44336",
          }}
        >
          {emailRelay.overall_configured ? "Configured" : "Not Configured"}
        </span>
      </Typography>

      <Typography variant="subtitle1">Base Domain:</Typography>
      <Typography>
        Status:
        <span
          style={{
            color: emailRelay.base_domain.configured ? "#4caf50" : "#f44336",
          }}
        >
          {emailRelay.base_domain.configured ? "Configured" : "Not Configured"}
        </span>
      </Typography>
      {emailRelay.base_domain.mx_exists && (
        <Typography>MX Records exist</Typography>
      )}
      {emailRelay.base_domain.a_exists && (
        <Typography>A Records exist</Typography>
      )}

      <Typography variant="subtitle1">Subdomains:</Typography>
      {Object.entries(emailRelay.subdomains).map(([subdomain, data]) => (
        <Accordion key={subdomain}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>
              {subdomain}:
              <span style={{ color: data.configured ? "#4caf50" : "#f44336" }}>
                {data.configured ? "Configured" : "Not Configured"}
              </span>
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <div>
              {data.mx_exists && (
                <>
                  <Typography>MX Records:</Typography>
                  <ul>
                    {data.mx_records.map((record, i) => (
                      <li key={i}>{record}</li>
                    ))}
                  </ul>
                </>
              )}
              {data.a_exists && (
                <>
                  <Typography>A Records:</Typography>
                  <ul>
                    {data.a_records.map((record, i) => (
                      <li key={i}>{record}</li>
                    ))}
                  </ul>
                </>
              )}
              {!data.mx_exists && !data.a_exists && (
                <Typography>No email relay records found</Typography>
              )}
            </div>
          </AccordionDetails>
        </Accordion>
      ))}
    </Paper>
  );
}

export default function App() {
  const classes = useStyles();
  const [domain, setDomain] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!domain) return setError("Please enter a domain");

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/check-domain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      });
      setResults(await response.json());
    } catch (err) {
      setError("Failed to check domain");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={classes.root}>
      <Container maxWidth="md">
        <Typography variant="h3" className={classes.header}>
          Domain Authentication Checker
        </Typography>

        <Paper className={classes.inputContainer}>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={8}>
                <TextField
                  fullWidth
                  label="Enter domain (e.g., example.com)"
                  variant="outlined"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  error={!!error}
                  helperText={error}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  size="large"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={24} /> : "Check Domain"}
                </Button>
              </Grid>
            </Grid>
          </form>
        </Paper>

        {results && (
          <>
            {/* Main Domain Results Card */}
            <Paper className={classes.resultCard}>
              <Typography variant="h5">Results for {results.domain}</Typography>

              <Grid container spacing={3}>
                {/* SPF Section */}
                <Grid item xs={12} md={6}>
                  <Typography>
                    {results.spf.exists ? (
                      <CheckCircleIcon className={classes.success} />
                    ) : (
                      <ErrorIcon className={classes.error} />
                    )}{" "}
                    SPF
                  </Typography>
                  {results.spf.records?.map((r, i) => (
                    <Chip
                      key={i}
                      label={r}
                      variant="outlined"
                      className={classes.chip}
                    />
                  ))}
                </Grid>

                {/* DKIM Section */}
                <Grid item xs={12} md={6}>
                  <Typography>
                    {Object.keys(results.dkim).length > 0 ? (
                      <CheckCircleIcon className={classes.success} />
                    ) : (
                      <ErrorIcon className={classes.error} />
                    )}{" "}
                    DKIM
                  </Typography>
                  {Object.entries(results.dkim).map(([selector, data]) => (
                    <Accordion key={selector}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography>{selector}</Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <div>
                          <Typography variant="body2">{data.domain}</Typography>
                          {data.records.map((record, i) => (
                            <Chip
                              key={i}
                              label={record}
                              variant="outlined"
                              className={classes.chip}
                            />
                          ))}
                        </div>
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </Grid>

                {/* DMARC Section */}
                <Grid item xs={12} md={6}>
                  <Typography>
                    {results.dmarc.exists ? (
                      <CheckCircleIcon className={classes.success} />
                    ) : (
                      <ErrorIcon className={classes.error} />
                    )}{" "}
                    DMARC
                  </Typography>
                  {results.dmarc.records?.map((r, i) => (
                    <Chip
                      key={i}
                      label={r}
                      variant="outlined"
                      className={classes.chip}
                    />
                  ))}
                </Grid>

                {/* MX Records Section */}
                <Grid item xs={12} md={6}>
                  <Typography>
                    {results.mx.exists ? (
                      <CheckCircleIcon className={classes.success} />
                    ) : (
                      <ErrorIcon className={classes.error} />
                    )}{" "}
                    MX Records
                  </Typography>
                  {results.mx.records?.map((r, i) => (
                    <Chip
                      key={i}
                      label={r}
                      variant="outlined"
                      className={classes.chip}
                    />
                  ))}
                </Grid>
              </Grid>
            </Paper>

            {/* SMTP Test Results (if available) */}
            {results.smtp && (
              <Paper className={classes.resultCard}>
                <Typography variant="h6">SMTP Connectivity</Typography>
                {results.smtp.map((test, index) => (
                  <div key={index}>
                    <Typography>
                      {test.success ? (
                        <CheckCircleIcon className={classes.success} />
                      ) : (
                        <ErrorIcon className={classes.error} />
                      )}
                      {test.host} {test.port && `(Port ${test.port})`}
                    </Typography>
                    {test.success ? (
                      <Typography variant="body2" color="textSecondary">
                        Response: {test.response}
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="error">
                        Error: {test.error}
                      </Typography>
                    )}
                  </div>
                ))}
              </Paper>
            )}

            {/* Email Relay Results */}
            <EmailRelayResults emailRelay={results.email_relay} />
          </>
        )}
      </Container>
    </div>
  );
}
