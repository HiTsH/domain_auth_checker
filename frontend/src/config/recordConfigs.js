export const recordConfigs = [
  {
    key: "spf",
    title: "SPF",
    exists: (results) => results.spf.exists,
    records: (results) => results.spf.records,
    gridSize: { xs: 12, md: 6 },
  },
  {
    key: "dkim",
    title: "DKIM",
    exists: (results) => Object.keys(results.dkim).length > 0,
    records: (results) => results.dkim,
    isAccordion: true,
    gridSize: { xs: 12, md: 6 },
  },
  {
    key: "dmarc",
    title: "DMARC",
    exists: (results) => results.dmarc.exists,
    records: (results) => results.dmarc.records,
    gridSize: { xs: 12, md: 6 },
  },
  {
    key: "mx",
    title: "MX Records",
    exists: (results) => results.mx.exists,
    records: (results) => results.mx.records,
    gridSize: { xs: 12, md: 6 },
  },
];
