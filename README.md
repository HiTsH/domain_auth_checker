# Domain Authentication Checker

A web application that checks DNS records (SPF, DKIM, DMARC) and email server configurations for any domain.

## Features

- SPF record validation
- DKIM configuration checking
- DMARC policy analysis
- SMTP server testing
- Subdomain checking

## Local Development

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
flask run
```

### Frontend

```bash
cd frontend
npm install
npm start
```
