# Contributing to Virtual Office

Thank you for your interest in contributing to Virtual Office! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

- Be respectful and inclusive
- Focus on the code, not the person
- Help others learn and grow
- Report inappropriate behavior to maintainers

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Create a feature branch from `master`
4. Make your changes
5. Test thoroughly
6. Submit a pull request

## Development Workflow

### Setting Up

```bash
git clone https://github.com/yourusername/virtual-office.git
cd virtual-office
npm install
npm run dev
```

### Code Style

- Use descriptive variable and function names
- Keep functions focused and small
- Add comments for complex logic
- Use consistent formatting (2-space indentation)

### Component Guidelines

- Keep components focused on a single responsibility
- Use React hooks instead of class components
- Prop destructuring in function parameters
- Default props documented via JSDoc comments
- Add accessibility attributes (aria-labels, roles)

### Testing

- Test on mobile, tablet, and desktop
- Test on multiple browsers (Chrome, Firefox, Safari, Edge)
- Verify responsive design at breakpoints: 320px, 640px, 1024px, 1280px
- Test keyboard navigation
- Test with screen readers

### WebRTC-Specific Testing

- Test with stable internet connection
- Test with poor network conditions
- Test with multiple peers (2-5 participants)
- Verify STUN server fallback
- Check media stream cleanup on disconnect

## Pull Request Process

1. Update documentation if needed
2. Add/update tests if applicable
3. Ensure all browser tests pass
4. Provide clear PR description
5. Link any related issues
6. Be responsive to review feedback

### PR Title Format

```
[TYPE] Brief description

Types: feat, fix, docs, style, refactor, perf, test
```

### PR Description Template

```markdown
## Description
Brief overview of changes

## Related Issues
Fixes #issue_number

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing Done
List of testing performed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-reviewed changes
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tested on mobile/tablet/desktop
```

## Commit Message Guidelines

Use clear, descriptive commit messages:

```
feat: add connection quality indicator
fix: resolve audio dropout on reconnect
docs: update accessibility guidelines
refactor: simplify WebRTC peer creation
perf: optimize call history rendering
test: add audio stream tests
```

## Areas for Contribution

### High Priority
- Screen sharing support
- End-to-end encryption enhancement
- Mobile app support
- Team/workspace management

### Medium Priority
- Message chat integration
- Call recording (with consent)
- Advanced routing (VPN support)
- Custom STUN server support

### Low Priority
- UI themes and customization
- Analytics dashboard
- Admin controls
- API documentation

## Reporting Issues

### Bug Reports

Include:
- Browser and OS version
- Steps to reproduce
- Expected behavior
- Actual behavior
- Screenshots if applicable
- Console errors (if any)

### Feature Requests

Include:
- Clear use case
- Why it's needed
- Proposed solution
- Alternative approaches
- Mockups/examples if helpful

## Documentation

### Code Comments

```javascript
// Good: explains why, not what
// Filter peers to exclude already-connected participants
const availablePeers = peers.filter(p => !groupCallPeers.includes(p.id));

// Bad: explains what the code does
// Filter the peers array
const availablePeers = peers.filter(p => !groupCallPeers.includes(p.id));
```

### README Updates

- Keep technical accuracy
- Include code examples
- Update table of contents
- Test all links

### JSDoc Comments

```javascript
/**
 * Establishes WebRTC peer connection
 * @param {string} remoteId - Peer's unique identifier
 * @returns {RTCPeerConnection} Configured peer connection
 */
const getPeerConnection = (remoteId) => { ... }
```

## Performance Considerations

- Avoid unnecessary renders
- Use lazy loading for heavy components
- Optimize CSS selectors
- Minimize event listener creation
- Profile before optimizing

## Accessibility Checklist

- [ ] Semantic HTML elements used
- [ ] Color contrast meets WCAG AA
- [ ] Keyboard navigation works
- [ ] Focus indicators visible
- [ ] ARIA labels present
- [ ] Mobile tap targets >= 44x44px
- [ ] Reduced motion respected

## Browser Compatibility

Test on:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Questions?

- Check documentation first
- Search existing issues
- Ask in discussions
- Contact maintainers

## License

By contributing, you agree your code will be licensed under MIT.

---

Thank you for helping make Virtual Office better!
