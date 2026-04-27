```md
# Python Setup

## Create virtual environment
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
```

## Install dependencies
```bash
pip install -r requirements.txt
```

## Run server
```bash
uvicorn main:app --reload
```