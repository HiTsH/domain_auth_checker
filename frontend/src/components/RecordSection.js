import React from "react";
import {
  Box,
  Typography,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@material-ui/core";
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  ExpandMore as ExpandMoreIcon,
} from "@material-ui/icons";

const RecordSection = ({
  exists,
  records,
  title,
  classes,
  isAccordion = false,
  accordionData = null,
}) => {
  return (
    <Box>
      <Box className={classes.statusText}>
        {exists ? (
          <CheckCircleIcon className={classes.success} />
        ) : (
          <ErrorIcon className={classes.error} />
        )}
        <Typography variant="body1">
          <strong>{title}</strong>
        </Typography>
      </Box>
      <Box>
        {isAccordion
          ? Object.entries(accordionData).map(([key, data]) => (
              <Accordion key={key}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>{key}</Typography>
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
            ))
          : records?.map((r, i) => (
              <Chip
                key={i}
                label={r}
                variant="outlined"
                className={classes.chip}
              />
            ))}
      </Box>
    </Box>
  );
};

export default RecordSection;
