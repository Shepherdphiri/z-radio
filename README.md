# StreamCast - Live Audio Broadcasting Platform

StreamCast is a professional browser-based live audio broadcasting platform built with WebRTC technology. It allows users to broadcast live audio streams with minimal latency and provides listeners with real-time access to these broadcasts.

## Features

- **Real-time Audio Broadcasting**: WebRTC-based audio streaming with low latency
- **Browser-based**: No downloads required - works directly in modern web browsers
- **Device Selection**: Choose from available microphones for broadcasting
- **Audio Quality Control**: Select from high, medium, or low quality settings
- **Live Dashboard**: Real-time statistics and connection monitoring
- **Shareable Links**: Generate direct links for listeners to join broadcasts
- **Professional UI**: Modern, responsive interface built with Tailwind CSS
- **Custom Developer Branding**: Footer with developer credit and portfolio link

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: Express.js + TypeScript
- **Real-time**: WebSocket + WebRTC
- **Database**: PostgreSQL with Drizzle ORM (includes in-memory storage option)
- **UI**: shadcn/ui components with Tailwind CSS
- **State Management**: TanStack Query

## Installation

1. Clone or extract the project files
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables (optional for PostgreSQL):
   ```bash
   DATABASE_URL=your_postgresql_connection_string
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:5000`

## Usage

### Broadcasting
1. Open the application in your browser
2. Select your microphone from the dropdown
3. Choose audio quality (high/medium/low)
4. Click "Start Broadcast" to go live
5. Share the generated link with listeners

### Listening
1. Receive a broadcast link from a broadcaster
2. Enter the link in the "Join Broadcast" field
3. Click "Join" to connect to the live stream
4. Use the volume controls and play/pause as needed

## Project Structure

```
├── client/               # React frontend
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── lib/          # Utilities and configurations
│   │   └── pages/        # Application pages
├── server/               # Express.js backend
│   ├── index.ts          # Server entry point
│   ├── routes.ts         # API routes and WebSocket handling
│   ├── storage.ts        # Data storage layer
│   └── vite.ts           # Vite integration
├── shared/               # Shared types and schemas
└── components.json       # shadcn/ui configuration
```

## Deployment Options

### 1. Vercel (Recommended for Full-Stack)
- Push to GitHub repository
- Connect to Vercel
- Set Node.js version to 18+
- Configure build command: `npm run build`
- Add environment variables if using PostgreSQL

### 2. Netlify
- Build command: `npm run build`
- Publish directory: `dist/public`
- Functions directory: `dist/server` (for serverless functions)

### 3. Railway
- Connect GitHub repository
- Railway auto-detects Node.js
- Add PostgreSQL database addon
- Set environment variables

### 4. Render
- Connect GitHub repository  
- Build command: `npm run build`
- Start command: `npm start`
- Add PostgreSQL database
- Set environment variables

### 5. DigitalOcean App Platform
- Connect GitHub repository
- Configure Node.js runtime
- Add managed PostgreSQL database
- Set environment variables

## Environment Variables

```bash
# Optional - for PostgreSQL database
DATABASE_URL=postgresql://username:password@hostname:port/database

# Production settings
NODE_ENV=production
PORT=5000
```

## Build Commands

```bash
# Development
npm run dev

# Production build
npm run build

# Start production server
npm start

# Database operations (if using PostgreSQL)
npm run db:push
npm run db:studio
```

## Browser Compatibility

- Chrome 88+
- Firefox 85+
- Safari 14+
- Edge 88+

WebRTC and MediaDevices API support required.

## License

Built by Shepherd Zisper Phiri - https://shepherd-portfolio.onrender.com