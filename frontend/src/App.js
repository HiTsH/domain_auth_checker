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
  Box,
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
    fontWeight: 500,
  },
  inputContainer: {
    marginBottom: theme.spacing(4),
    padding: theme.spacing(3),
    backgroundColor: "#ffffff",
    borderRadius: 8,
    boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
  },
  resultCard: {
    padding: theme.spacing(3),
    marginBottom: theme.spacing(3),
    borderRadius: 8,
    backgroundColor: "#ffffff",
    boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
  },
  success: {
    color: "#4caf50",
    marginRight: theme.spacing(1),
  },
  error: {
    color: "#f44336",
    marginRight: theme.spacing(1),
  },
  chip: {
    marginRight: theme.spacing(1),
    marginBottom: theme.spacing(1),
  },
  statusText: {
    display: "flex",
    alignItems: "center",
    marginBottom: theme.spacing(2),
  },
  sectionTitle: {
    marginBottom: theme.spacing(2),
    fontWeight: 500,
  },
  accordionDetails: {
    flexDirection: "column",
  },
}));

const EmailRelayResults = ({ emailRelay, classes }) => {
  if (!emailRelay) return null;

  return (
    <Paper className={classes.resultCard}>
      {emailRelay.error ? (
        <Typography>Error checking email relay: {emailRelay.error}</Typography>
      ) : (
        <>
          <Typography variant="h6" className={classes.sectionTitle}>
            Email Relay Configuration
          </Typography>
          <Box className={classes.statusText}>
            <Typography variant="body1">
              <strong>Overall Status:</strong>
              <span
                style={{
                  color: emailRelay.overall_configured ? "#4caf50" : "#f44336",
                  marginLeft: 8,
                }}
              >
                {emailRelay.overall_configured
                  ? "Configured"
                  : "Not Configured"}
              </span>
            </Typography>
          </Box>

          <Typography variant="subtitle1" className={classes.sectionTitle}>
            Base Domain:
          </Typography>
          <Box className={classes.statusText}>
            <Typography variant="body1">
              <strong>Status:</strong>
              <span
                style={{
                  color: emailRelay.base_domain.configured
                    ? "#4caf50"
                    : "#f44336",
                  marginLeft: 8,
                }}
              >
                {emailRelay.base_domain.configured
                  ? "Configured"
                  : "Not Configured"}
              </span>
            </Typography>
          </Box>

          {emailRelay.base_domain.mx_exists && (
            <Typography variant="body2">✓ MX Records exist</Typography>
          )}
          {emailRelay.base_domain.a_exists && (
            <Typography variant="body2">✓ A Records exist</Typography>
          )}

          <Typography variant="subtitle1" className={classes.sectionTitle}>
            Subdomains:
          </Typography>
          {Object.entries(emailRelay.subdomains).map(([subdomain, data]) => (
            <Accordion key={subdomain}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>
                  {subdomain}:
                  <span
                    style={{
                      color: data.configured ? "#4caf50" : "#f44336",
                      marginLeft: 8,
                    }}
                  >
                    {data.configured ? "Configured" : "Not Configured"}
                  </span>
                </Typography>
              </AccordionSummary>
              <AccordionDetails className={classes.accordionDetails}>
                {data.mx_exists && (
                  <>
                    <Typography variant="body2">MX Records:</Typography>
                    <Box>
                      {data.mx_records.map((record, i) => (
                        <Chip
                          key={i}
                          label={record}
                          variant="outlined"
                          className={classes.chip}
                        />
                      ))}
                    </Box>
                  </>
                )}
                {data.a_exists && (
                  <>
                    <Typography variant="body2">A Records:</Typography>
                    <Box>
                      {data.a_records.map((record, i) => (
                        <Chip
                          key={i}
                          label={record}
                          variant="outlined"
                          className={classes.chip}
                        />
                      ))}
                    </Box>
                  </>
                )}
                {!data.mx_exists && !data.a_exists && (
                  <Typography variant="body2">
                    No email relay records found
                  </Typography>
                )}
              </AccordionDetails>
            </Accordion>
          ))}
        </>
      )}
    </Paper>
  );
};

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
            <Paper className={classes.resultCard}>
              <Typography variant="h5" className={classes.sectionTitle}>
                Results for {results.domain}
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Box className={classes.statusText}>
                    {results.spf.exists ? (
                      <CheckCircleIcon className={classes.success} />
                    ) : (
                      <ErrorIcon className={classes.error} />
                    )}
                    <Typography variant="body1">
                      <strong>SPF</strong>
                    </Typography>
                  </Box>
                  <Box>
                    {results.spf.records?.map((r, i) => (
                      <Chip
                        key={i}
                        label={r}
                        variant="outlined"
                        className={classes.chip}
                      />
                    ))}
                  </Box>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Box className={classes.statusText}>
                    {Object.keys(results.dkim).length > 0 ? (
                      <CheckCircleIcon className={classes.success} />
                    ) : (
                      <ErrorIcon className={classes.error} />
                    )}
                    <Typography variant="body1">
                      <strong>DKIM</strong>
                    </Typography>
                  </Box>
                  <Box>
                    {Object.entries(results.dkim).map(([selector, data]) => (
                      <Accordion key={selector}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Typography>{selector}</Typography>
                        </AccordionSummary>
                        <AccordionDetails className={classes.accordionDetails}>
                          <Typography variant="body2">{data.domain}</Typography>
                          <Box>
                            {data.records.map((record, i) => (
                              <Chip
                                key={i}
                                label={record}
                                variant="outlined"
                                className={classes.chip}
                              />
                            ))}
                          </Box>
                        </AccordionDetails>
                      </Accordion>
                    ))}
                  </Box>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Box className={classes.statusText}>
                    {results.dmarc.exists ? (
                      <CheckCircleIcon className={classes.success} />
                    ) : (
                      <ErrorIcon className={classes.error} />
                    )}
                    <Typography variant="body1">
                      <strong>DMARC</strong>
                    </Typography>
                  </Box>
                  <Box>
                    {results.dmarc.records?.map((r, i) => (
                      <Chip
                        key={i}
                        label={r}
                        variant="outlined"
                        className={classes.chip}
                      />
                    ))}
                  </Box>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Box className={classes.statusText}>
                    {results.mx.exists ? (
                      <CheckCircleIcon className={classes.success} />
                    ) : (
                      <ErrorIcon className={classes.error} />
                    )}
                    <Typography variant="body1">
                      <strong>MX Records</strong>
                    </Typography>
                  </Box>
                  <Box>
                    {results.mx.records?.map((r, i) => (
                      <Chip
                        key={i}
                        label={r}
                        variant="outlined"
                        className={classes.chip}
                      />
                    ))}
                  </Box>
                </Grid>
              </Grid>
            </Paper>

            {results.smtp && (
              <Paper className={classes.resultCard}>
                <Typography variant="h6" className={classes.sectionTitle}>
                  SMTP Connectivity
                </Typography>
                {results.smtp.map((test, index) => (
                  <Box key={index} mb={2}>
                    <Box className={classes.statusText}>
                      {test.success ? (
                        <CheckCircleIcon className={classes.success} />
                      ) : (
                        <ErrorIcon className={classes.error} />
                      )}
                      <Typography>
                        <strong>{test.host}</strong>{" "}
                        {test.port && `(Port ${test.port})`}
                      </Typography>
                    </Box>
                    {test.success ? (
                      <Typography variant="body2" color="textSecondary">
                        Response: {test.response}
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="error">
                        Error: {test.error}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Paper>
            )}

            <EmailRelayResults
              emailRelay={results.email_relay}
              classes={classes}
            />
          </>
        )}
      </Container>
    </div>
  );
}
