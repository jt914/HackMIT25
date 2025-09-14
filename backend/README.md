# CodeByte Backend API

The backend API for CodeByte, an AI-powered learning platform that provides personalized coding lessons and interactive learning experiences.

## 🚀 Features

- **FastAPI Framework**: Modern, fast Python web framework
- **AI Integration**: Multiple AI APIs for lesson generation
- **User Authentication**: JWT-based secure authentication
- **MongoDB Integration**: Document-based data storage
- **Video Generation**: AI-powered educational video creation
- **Interactive Lessons**: Dynamic lesson content and progress tracking

## 🛠 Technology Stack

- **FastAPI** - Web framework
- **MongoDB** - Database
- **PyJWT** - JWT token handling
- **Pydantic** - Data validation
- **Manim** - Video generation
- **OpenAI/Anthropic APIs** - AI content generation

## 📋 API Endpoints

### Authentication
- `POST /auth/login` - User login
- `POST /auth/signup` - User registration
- `POST /auth/logout` - User logout

### Lessons
- `GET /lessons` - Get all lessons
- `POST /lessons/generate` - Generate new lesson
- `GET /lessons/{id}` - Get specific lesson
- `POST /lessons/enroll` - Enroll in lesson

### User Management
- `GET /user/me` - Get user profile
- `PUT /user/update` - Update user profile
- `POST /user/change-password` - Change password

### Chat & AI
- `POST /chat` - Chat with AI tutor
- `POST /interactive-slide` - Interactive lesson slides

## 🚀 Getting Started

### Prerequisites
- Python 3.12+
- MongoDB instance
- UV package manager (recommended)

### Installation
```bash
# Install dependencies
uv install

# Run development server
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Environment Variables
Create a `.env` file with:
```
MONGODB_URI=mongodb://localhost:27017/codebyte
JWT_SECRET_KEY=your-secret-key
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
```

## 📁 Project Structure

```
backend/
├── app/
│   ├── agent/          # AI agents and tools
│   ├── api_clients/    # External API clients
│   ├── database_builder/ # Data ingestion
│   ├── services/       # Business logic
│   ├── utils/          # Utility functions
│   ├── auth.py         # Authentication
│   ├── main.py         # FastAPI app
│   └── models.py       # Pydantic models
├── media/              # Generated media files
└── tests/              # Test files
```

## 🔧 Development

### Running Tests
```bash
uv run pytest
```

### Code Quality
```bash
uv run ruff check
uv run ruff format
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.
