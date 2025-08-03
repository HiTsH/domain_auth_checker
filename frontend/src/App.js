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
          <Paper className={classes.resultCard}>
            <Typography variant="h5">Results for {results.domain}</Typography>
            <Grid container spacing={3}>
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
              {/* Add other result sections similarly */}
            </Grid>
          </Paper>
        )}
      </Container>
    </div>
  );
}
