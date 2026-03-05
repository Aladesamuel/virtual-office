# Virtual Office - Open Source Communication Kit

A lightweight, serverless virtual office platform built for startups. Enable your team to communicate seamlessly with real-time peer-to-peer audio, without expensive infrastructure or databases.

## Features

- **Zero Server/Database**: Runs entirely client-side using WebRTC
- **P2P Audio Communication**: Direct peer-to-peer calls with crystal-clear audio
- **Status Management**: Available, Busy, Away status indicators
- **Group Calling**: Add multiple participants to extend 1-on-1 conversations
- **Connection Quality Monitoring**: Real-time network quality indicators
- **Do Not Disturb Mode**: Auto-reject calls when you need focus
- **Call History**: Track your communications locally
- **Responsive Design**: Works on mobile, tablet, and desktop
- **Accessibility**: WCAG AA compliant with keyboard navigation support
- **Privacy-First**: All communication is peer-to-peer and encrypted

## Getting Started

### Prerequisites

- Node.js 16+
- Modern browser with WebRTC support (Chrome, Firefox, Safari, Edge)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/virtual-office.git
cd virtual-office

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will open at `http://localhost:5173`

### Deployment

```bash
# Build for production
npm run build

# The dist/ folder is ready to be deployed to any static hosting service
# Vercel, Netlify, GitHub Pages, etc.
```

## Architecture

### Technology Stack

- **Frontend**: React 18+ with modern hooks
- **Real-time Communication**: WebRTC (RTCPeerConnection)
- **Signaling**: MQTT.js for peer discovery and signaling
- **Styling**: CSS3 with responsive design patterns
- **State Management**: React hooks (useState, useContext, useRef)

### Key Components

- **Room.jsx**: Main virtual office interface
- **Home.jsx**: Landing page and room creation
- **useWebRTC.js**: WebRTC peer connection management
- **ActiveCallModal.jsx**: In-call UI with peer list
- **ConnectionQuality.jsx**: Network quality indicator
- **DoNotDisturb.jsx**: Status management with DND mode
- **CallHistory.jsx**: Local call history storage
- **ErrorBoundary.jsx**: Error handling and recovery

## Usage

### Creating a Virtual Office

1. Visit the home page
2. Click "Create Workspace"
3. Share the generated room URL with your team
4. Anyone with the URL can join instantly

### Making Calls

1. Enter your name and join the office
2. Click a team member's card to initiate a call
3. Audio connection establishes automatically via WebRTC
4. Your status and connection quality appear in the header

### Advanced Features

- **Group Calls**: Click "Add Person" while in a call to add more participants
- **Quick Status**: Switch between Available, Busy, Away from the control bar
- **Do Not Disturb**: Toggle DND mode to auto-reject incoming calls
- **Call History**: View your recent calls from the control bar clock icon

## Responsive Design

The application is optimized for all screen sizes:

- **Mobile (320px+)**: Compact cards, touch-optimized buttons, bottom control bar
- **Tablet (640px+)**: Wider cards, expanded status pills, improved spacing
- **Desktop (1024px+)**: Full-featured layout with connection quality display

## Accessibility Features

- Keyboard navigation support with visible focus indicators
- ARIA labels for screen readers
- Semantic HTML structure
- High contrast mode support
- Reduced motion preferences respected
- Touch-friendly button sizing (minimum 44x44px)

## Browser Support

- Chrome/Chromium 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Requires WebRTC support and getUserMedia API access.

## Performance Considerations

- Audio-only communication reduces bandwidth
- P2P architecture eliminates server bottlenecks
- Local call history stored in browser localStorage
- Connection quality monitoring at 2-second intervals
- Automatic STUN server selection for NAT traversal

## Security & Privacy

- **No Server Storage**: All data stays on your device
- **Encrypted Transport**: WebRTC uses DTLS encryption
- **No Surveillance**: No call recording or monitoring
- **Local Data Only**: Call history stored in localStorage
- **Room Isolation**: Each room is independent

## Development

### Project Structure

```
src/
├── components/          # Reusable React components
│   ├── ActiveCallModal.jsx
│   ├── ConnectionQuality.jsx
│   ├── DoNotDisturb.jsx
│   ├── CallHistory.jsx
│   └── ErrorBoundary.jsx
├── pages/              # Page components
│   ├── Home.jsx
│   └── Room.jsx
├── hooks/              # Custom React hooks
│   └── useWebRTC.js
├── App.jsx            # Main app component
├── main.jsx           # Entry point
└── index.css          # Global styles
```

### CSS Architecture

- **Design Tokens**: CSS custom properties for colors, shadows, spacing
- **Mobile-First**: Base styles for small screens, enhanced with media queries
- **Responsive**: `clamp()` functions for fluid typography and sizing
- **Accessibility**: Focus states, reduced motion support, high contrast

### Key Hooks

**useWebRTC(roomId, userName, isJoined)**
- Manages WebRTC peer connections
- Handles MQTT signaling for peer discovery
- Tracks active peers and connection state
- Returns: peers, myId, myStatus, isMuted, isLocked, etc.

## Troubleshooting

### Audio Not Working
1. Check browser microphone permissions
2. Verify other browsers/applications aren't blocking the mic
3. Test at https://webrtc.github.io/samples/

### Can't Connect to Peers
1. Verify both users are in the same room ID
2. Check internet connectivity and firewall
3. STUN servers may be blocked - try a VPN

### Call Quality Issues
1. Check the connection quality indicator in the header
2. Reduce background processes consuming bandwidth
3. Move closer to your WiFi router
4. Consider using a wired connection

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - feel free to use this in personal and commercial projects.

## Support

For issues, questions, or suggestions:
- Open a GitHub issue
- Check existing documentation
- Review examples and troubleshooting guide

---

**Virtual Office**: Making remote teamwork as natural as walking across an office floor.
