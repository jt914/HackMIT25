# CodeByte - AI-Powered Learning Platform 🚀

**CodeByte** transforms your team's codebase, Linear tickets, and Slack conversations into personalized, interactive coding lessons. Built for HackMIT 2025, this platform leverages cutting-edge AI to create educational content from real development workflows.

## Core Architecture

**AI-Powered Content Generation**: The system uses LlamaIndex ReAct agents with OpenAI GPT models to intelligently search through vector-embedded codebases, Linear issues, and Slack messages. The agent framework includes sophisticated tool call limits (max 8 informational searches) to ensure efficient content generation while maintaining quality.

**Multi-Modal Learning Engine**: CodeByte generates three types of educational content:
- **Animated Video Lessons** using Manim for mathematical animations with gTTS narration, automatically uploaded to Cloudinary CDN
- **Interactive Investigation Slides** that simulate real debugging scenarios from past team issues
- **AI Chat Interface** for contextual Q&A about your codebase

**Distributed Data Processing**: The platform uses Daytona sandboxes for secure repository processing, with Tree-sitter for code parsing and Pinecone for vector storage. Each user gets isolated vector databases with separate namespaces for code, Linear tickets, and Slack messages.

## Technical Highlights

### Vector-Powered Code Intelligence
- **Semantic Code Search**: Uses LlamaIndex with Pinecone to create searchable vector embeddings of entire codebases
- **Multi-Source Integration**: Combines code analysis with Linear ticket context and Slack discussions for comprehensive understanding
- **Real-time Sync**: Automatic ingestion pipelines for GitHub repos, Linear tickets, and Slack channels with connection state management

### AI Video Generation Pipeline
- **Manim Integration**: Programmatic video creation with mathematical animations and bullet points
- **Text-to-Speech**: Automatic narration generation using Google TTS
- **Veo3 AI Video**: Experimental integration with Google's Veo 3.0 for AI-generated software engineering videos
- **Cloudinary CDN**: Automatic video optimization and global delivery

### Interactive Learning System
- **Investigation Scenarios**: AI generates debugging challenges based on real past issues from your team
- **Contextual Hints**: Smart hint system that provides guidance without revealing solutions
- **Progress Tracking**: Comprehensive lesson progress with completion analytics

### Modern Full-Stack Architecture
- **Backend**: FastAPI with async operations, JWT authentication, and MongoDB for persistence
- **Frontend**: Next.js 15 with React 19, Tailwind CSS, and shadcn/ui components
- **Real-time Updates**: Connection state monitoring with event tracking for all data sources

## Tech Stack

**Backend**: FastAPI, LlamaIndex, OpenAI GPT, Pinecone, MongoDB, Daytona, Manim, MoviePy  
**Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS, shadcn/ui  
**AI/ML**: OpenAI GPT-5, Google Veo 3.0, Tree-sitter, gTTS  
**Infrastructure**: Cloudinary CDN, Pinecone Vector DB, Linear API, Slack API

## Key Features

- **Smart Lesson Generation**: Creates 10-15 slide lessons from codebase analysis
- **Multi-Source Learning**: Integrates code, tickets, and team discussions
- **Interactive Debugging**: Simulates real investigation scenarios
- **Automated Video Creation**: Generates educational videos with animations and narration
- **Progress Analytics**: Tracks learning progress with completion metrics
- **Secure Processing**: Isolated sandbox environments for code analysis

CodeByte represents the future of developer education - turning your existing development workflow into a powerful learning platform that helps teams understand their systems better through AI-generated, contextual educational content.