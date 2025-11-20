# AI Assistant Feature Documentation

## Overview

The AI Assistant is a GPT-powered conversational interface that provides expert guidance on NIST 800-53 security controls. It offers contextual help, implementation advice, and answers to compliance-related questions.

## 🎯 Features

### Frontend Components

#### AssistantSidebar Component
- **Location**: `src/components/AssistantSidebar.jsx`
- **Collapsible sidebar**: Slides in from the right side
- **Responsive design**: Full-screen on mobile, fixed width on desktop (384px)
- **Context-aware**: Shows current control being discussed
- **Real-time chat**: Instant messaging interface with markdown support

#### Navigation Integration
- **Toggle button**: Added to Navigation component with chat bubble icon
- **Visual indicators**: Active state with pulsing dot when open
- **Mobile support**: Dedicated button in mobile navigation

### Backend API

#### Assistant Endpoint
- **Route**: `POST /api/assistant`
- **File**: `../backend/routes/assistant.py`
- **Model**: GPT-3.5-turbo via OpenAI API
- **Max tokens**: 400 words per response
- **Context-aware**: Uses control details when available

## 🚀 Usage

### Opening the Assistant
1. Click the "AI Assistant" button in the navigation bar
2. On mobile: Tap the chat bubble icon
3. Sidebar slides in from the right

### Asking Questions
1. **General questions**: Type any NIST 800-53 related question
2. **Control-specific**: When viewing a control, questions are automatically contextualized
3. **Example prompts**: Click any suggested prompt to auto-fill and submit

### Example Prompts
- "Explain this control in simple terms"
- "What does this control mitigate?"
- "How do I implement this in AWS?"
- "What are common compliance pitfalls?"
- "Show me a real-world example"

## 🔧 Technical Implementation

### Frontend Architecture

```jsx
// State management
const [messages, setMessages] = useState([])
const [inputValue, setInputValue] = useState('')
const [isLoading, setIsLoading] = useState(false)

// API call structure
const response = await fetch('/api/assistant', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    question: message,
    control_id: currentControl?.id || null,
    context: currentControl ? {
      title: currentControl.title,
      description: currentControl.description,
      family: currentControl.family
    } : null
  })
})
```

### Backend Architecture

```python
# Request/Response Models
class AssistantRequest(BaseModel):
    question: str
    control_id: Optional[str] = None
    context: Optional[Dict[str, Any]] = None

class AssistantResponse(BaseModel):
    response: str
    timestamp: datetime
    control_id: Optional[str] = None

# GPT Integration
response = client.chat.completions.create(
    model="gpt-3.5-turbo",
    messages=[
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": request.question}
    ],
    max_tokens=400,
    temperature=0.7
)
```

### System Prompts

#### With Control Context
```
You are a security compliance expert specializing in NIST 800-53 controls.

Current Context:
- Control ID: {control_id}
- Control Title: {title}
- Control Family: {family}
- Control Description: {description}

User Question: "{question}"

Provide a clear, accurate, and actionable response in under 300 words...
```

#### General Questions
```
You are a security compliance expert specializing in NIST 800-53 controls.

User Question: "{question}"

Provide a clear, accurate, and actionable response in under 300 words...
```

## 🎨 UI/UX Features

### Chat Interface
- **Message bubbles**: User messages (blue), Assistant messages (gray)
- **Timestamps**: Show when each message was sent
- **Loading indicator**: Animated dots while processing
- **Auto-scroll**: Automatically scrolls to newest messages

### Responsive Design
```css
/* Desktop: Fixed width sidebar */
w-full lg:w-96

/* Mobile: Full-screen overlay */
fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden
```

### Visual Elements
- **Icons**: Heroicons for consistent design
- **Gradients**: Purple/indigo theme matching app design
- **Animations**: Smooth slide transitions, pulse effects
- **Markdown**: Rich text formatting for assistant responses

## 🔐 Security & Error Handling

### API Key Management
- Environment variable: `OPENAI_API_KEY`
- Validation on startup
- Graceful error messages for missing keys

### Error Handling
```python
# Authentication errors
except Exception as openai_error:
    if "authentication" in str(openai_error).lower():
        raise HTTPException(status_code=401, detail="Invalid API key")
    elif "rate limit" in str(openai_error).lower():
        raise HTTPException(status_code=429, detail="Rate limit exceeded")
```

### Frontend Error Handling
- Network errors: "Please try again" message
- API errors: Specific error messages from backend
- Loading states: Prevents multiple simultaneous requests

## 🚀 Deployment

### Environment Setup
```bash
# Backend
export OPENAI_API_KEY="your-openai-api-key"

# Install dependencies (already included)
pip install openai>=1.12.0
```

### Frontend Integration
```jsx
// App.jsx
import AssistantSidebar from './components/AssistantSidebar'

// State management
const [isAssistantOpen, setIsAssistantOpen] = useState(false)

// Component usage
<AssistantSidebar
  isOpen={isAssistantOpen}
  onClose={() => setIsAssistantOpen(false)}
  currentControl={selectedControl}
/>
```

## 📊 Performance Considerations

### Optimization Features
- **Context memoization**: Avoids re-sending control details
- **Message persistence**: Chat history maintained during session
- **Debounced input**: Prevents accidental multiple submissions
- **Lazy loading**: Sidebar only renders when open

### Resource Management
- **Token limits**: 400 tokens max per response
- **Rate limiting**: Handled by OpenAI API
- **Memory usage**: Messages stored in component state only

## 🔄 Future Enhancements

### Planned Features
- **Chat history persistence**: Save conversations across sessions
- **Export conversations**: Download chat as PDF/text
- **Multiple AI models**: Support for GPT-4, Claude, etc.
- **Voice input**: Speech-to-text integration
- **Suggested follow-ups**: AI-generated next questions

### Integration Opportunities
- **Control recommendations**: "Related controls you might need"
- **Implementation templates**: Generate config files
- **Compliance mapping**: Map to other frameworks (SOC2, ISO 27001)
- **Team collaboration**: Share conversations with team members

## 🐛 Troubleshooting

### Common Issues

#### Assistant Not Responding
```bash
# Check OpenAI API key
echo $OPENAI_API_KEY

# Check backend logs
tail -f backend.log
```

#### Sidebar Not Opening
```javascript
// Check React state
console.log('isAssistantOpen:', isAssistantOpen)

// Check Navigation props
console.log('onAssistantToggle:', typeof onAssistantToggle)
```

#### API Errors
- **401 Unauthorized**: Invalid OpenAI API key
- **429 Rate Limited**: Too many requests, wait and retry
- **500 Server Error**: Check backend logs for details

### Development Tips
- Use browser dev tools to inspect network requests
- Check console for JavaScript errors
- Verify backend is running on correct port (8000)
- Test with simple questions first

## 📚 Related Documentation
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Hooks Guide](https://react.dev/reference/react)
- [Tailwind CSS Reference](https://tailwindcss.com/docs) 