# NIST Compliance App

A comprehensive NIST cybersecurity compliance management application featuring AI-powered assistance, automated playbook generation, and compliance tracking.

## Features

### 🤖 Spud AI Assistant
- AI-powered compliance chatbot
- NIST control explanations and guidance
- Implementation recommendations
- Available as a sidebar for quick access

### 🎯 Landing Page
- Modern, responsive design
- Feature showcase with quick access buttons
- NIST control search with autocomplete
- Quick stats and metrics

### 🏗️ Compliance Control Builder
- Multi-select NIST/STIG controls (up to 100)
- Baseline filtering (Low/Moderate/High)
- Generate combined Ansible playbooks
- Downloadable YAML output

### 📋 Core Features
- **POA&M Management**: Plan of Action and Milestones tracking
- **STIG Explorer**: Security Technical Implementation Guides
- **SCAP Integration**: Security Content Automation Protocol support
- **Ansible Automation**: Automated playbook generation
- **RMF Documentation**: Risk Management Framework docs
- **Compliance Dashboard**: Progress tracking and metrics
- **Drift Detection**: Configuration drift monitoring
- **Report Generation**: Automated compliance reports

## Tech Stack

### Backend
- **Python**: FastAPI framework
- **Uvicorn**: ASGI server
- **Pydantic**: Data validation
- **OpenAI API**: AI assistant functionality

### Frontend
- **React**: Modern UI framework
- **Vite**: Build tool and dev server
- **Tailwind CSS**: Utility-first styling
- **Heroicons**: Icon library
- **Chart.js**: Data visualization

## Quick Start

### Prerequisites
- Python 3.8+
- Node.js 16+
- npm or yarn

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
export OPENAI_API_KEY="your-api-key-here"
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Access the Application
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

## Environment Variables

Create a `.env` file in the backend directory:
```bash
OPENAI_API_KEY=your-openai-api-key
```

## Project Structure

```
nist-compliance-app/
├── backend/                 # Python FastAPI backend
│   ├── data/               # Sample data and controls
│   ├── models/             # Pydantic models
│   ├── routes/             # API endpoints
│   ├── services/           # Business logic
│   ├── playbook-templates/ # Ansible templates
│   └── main.py            # Application entry point
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── contexts/      # React contexts
│   │   └── utils/         # Utility functions
│   └── public/            # Static assets
└── README.md
```

## Key Components

### Backend Services
- **AI Adapter**: OpenAI integration for Spud AI
- **Playbook Generator**: Ansible playbook creation
- **Report Generator**: Compliance report generation
- **Drift Detector**: Configuration monitoring
- **SCAP Parser**: Security content processing

### Frontend Components
- **Landing**: Welcome page with feature showcase
- **SpudAI**: AI assistant interface
- **ComplianceControlBuilder**: Multi-control playbook generator
- **ControlExplorer**: NIST control browser
- **PlaybookGenerator**: Single control automation
- **ProgressTracker**: Implementation monitoring

## API Endpoints

### Core APIs
- `GET /api/controls` - List NIST controls
- `POST /api/playbook/generate` - Generate single playbook
- `POST /api/playbook/generate-bulk` - Generate multi-control playbook
- `POST /api/assistant` - Spud AI chat
- `GET /api/drift/stats` - Drift detection metrics

### Bulk Playbook Generation
```bash
POST /api/playbook/generate-bulk
{
  "control_ids": ["AC-2", "AU-2", "SC-28"],
  "operating_system": "ubuntu_20_04",
  "playbook_name": "Multi-Control-Compliance",
  "environment": "production"
}
```

## Development

### Running Tests
```bash
# Backend tests
cd backend
python -m pytest

# Frontend tests
cd frontend
npm test
```

### Building for Production
```bash
# Frontend build
cd frontend
npm run build

# Backend deployment
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000
```

## Features in Detail

### Spud AI Assistant
- Natural language NIST control explanations
- Implementation guidance and best practices
- Contextual help throughout the application
- Sidebar interface for quick access

### Compliance Control Builder
- Search and filter NIST/STIG controls
- Multi-select up to 100 controls
- Baseline impact level filtering
- Combined Ansible playbook generation
- YAML download functionality

### Playbook Generation
- Individual control automation
- Multi-control bulk generation
- Support for Ubuntu, RHEL, Windows
- Caching for improved performance
- Error handling and validation

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Check the API documentation at `/docs`
- Review the component README files
- Open an issue on GitHub

## Acknowledgments

- NIST Cybersecurity Framework
- OpenAI for AI capabilities
- React and FastAPI communities 