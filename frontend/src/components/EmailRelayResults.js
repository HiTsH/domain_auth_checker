import React from "react";
import {
  Paper,
  Typography,
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
} from "@material-ui/core";
import { ExpandMore as ExpandMoreIcon } from "@material-ui/icons";

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

export default EmailRelayResults;
