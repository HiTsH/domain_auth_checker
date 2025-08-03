import React, { useState } from "react";
import {
  Container,
  TextField,
  Button,
  Typography,
  Paper,
  Grid,
  CircularProgress,
  Box,
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from "@material-ui/icons";
import RecordSection from "./components/RecordSection";
import EmailRelayResults from "./components/EmailRelayResults";
import { recordConfigs } from "./config/recordConfigs";

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
                {recordConfigs.map((config) => (
                  <Grid item key={config.key} {...config.gridSize}>
                    <RecordSection
                      exists={config.exists(results)}
                      records={config.records(results)}
                      title={config.title}
                      classes={classes}
                      isAccordion={config.isAccordion}
                      accordionData={
                        config.isAccordion ? config.records(results) : null
                      }
                    />
                  </Grid>
                ))}
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
