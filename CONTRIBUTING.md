# Contributing to SAMS

Thank you for your interest in contributing to SAMS (Server and Application Monitoring System)! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- Git
- PostgreSQL 15+ (for local development)
- Redis 7+ (for local development)

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/sams-monitoring-system.git
   cd sams-monitoring-system
   ```

2. **Install Dependencies**
   ```bash
   # Backend
   cd sams-backend
   npm install
   
   # Mobile App
   cd ../sams-mobile/TestApp
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your local configuration
   ```

4. **Database Setup**
   ```bash
   # Start PostgreSQL and Redis
   docker-compose up -d postgres redis
   
   # Run migrations
   cd sams-backend
   npm run db:migrate
   ```

5. **Start Development Servers**
   ```bash
   # Backend (Terminal 1)
   cd sams-backend
   npm run dev
   
   # Mobile App (Terminal 2)
   cd sams-mobile/TestApp
   npm start
   ```

## 🌳 Branching Strategy

Please follow our [Branching Strategy](BRANCHING_STRATEGY.md) for all contributions.

### Quick Reference
- **Feature branches**: `feature/your-feature-name`
- **Bug fixes**: `bugfix/issue-description`
- **Hotfixes**: `hotfix/critical-fix`
- **Base branch**: `develop` (not `main`)

## 📝 Commit Guidelines

### Commit Message Format
```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples
```bash
feat(backend): add real-time alert processing
fix(mobile): resolve login validation issue
docs(api): update authentication endpoints
test(agents): add unit tests for metrics collection
```

## 🔍 Code Review Process

### Before Submitting a PR
- [ ] Code follows project style guidelines
- [ ] All tests pass locally
- [ ] New features include tests
- [ ] Documentation is updated
- [ ] No merge conflicts with target branch

### PR Requirements
- [ ] Descriptive title and description
- [ ] Link to related issues
- [ ] Screenshots for UI changes
- [ ] Test coverage maintained or improved
- [ ] No breaking changes (or clearly documented)

### Review Criteria
- **Functionality**: Does the code work as intended?
- **Security**: Are there any security vulnerabilities?
- **Performance**: Does it impact system performance?
- **Maintainability**: Is the code readable and well-structured?
- **Testing**: Are there adequate tests?

## 🧪 Testing Guidelines

### Backend Testing
```bash
cd sams-backend

# Unit tests
npm test

# Integration tests
npm run test:integration

# Coverage report
npm run test:coverage
```

### Mobile App Testing
```bash
cd sams-mobile/TestApp

# Unit tests
npm test

# E2E tests
npm run test:e2e

# Performance tests
npm run test:performance
```

### Test Requirements
- **Unit tests**: All new functions and methods
- **Integration tests**: API endpoints and database operations
- **E2E tests**: Critical user workflows
- **Coverage**: Maintain 80%+ code coverage

## 📚 Documentation Standards

### Code Documentation
- Use JSDoc for JavaScript/TypeScript functions
- Include parameter types and return values
- Provide usage examples for complex functions

### API Documentation
- Update OpenAPI/Swagger specs for API changes
- Include request/response examples
- Document error codes and messages

### README Updates
- Update feature lists for new functionality
- Add configuration options
- Include troubleshooting information

## 🎨 Code Style Guidelines

### TypeScript/JavaScript
- Use TypeScript for all new code
- Follow ESLint configuration
- Use Prettier for formatting
- Prefer functional programming patterns
- Use meaningful variable names

### React Native
- Use functional components with hooks
- Follow React Native best practices
- Implement proper error boundaries
- Use TypeScript interfaces for props

### Database
- Use descriptive table and column names
- Include proper indexes
- Write migration scripts for schema changes
- Follow PostgreSQL naming conventions

## 🔒 Security Guidelines

### General Security
- Never commit secrets or credentials
- Use environment variables for configuration
- Validate all user inputs
- Implement proper authentication and authorization

### API Security
- Use HTTPS in production
- Implement rate limiting
- Validate request payloads
- Use parameterized queries

### Mobile Security
- Secure local storage
- Implement certificate pinning
- Use biometric authentication where appropriate
- Encrypt sensitive data

## 🐛 Bug Reports

### Before Reporting
- Check existing issues
- Reproduce the bug consistently
- Test on latest version
- Gather relevant information

### Bug Report Template
```markdown
## Bug Description
Clear description of the bug

## Steps to Reproduce
1. Step one
2. Step two
3. Step three

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- OS: [e.g., iOS 16, Android 12, Ubuntu 22.04]
- App Version: [e.g., 1.0.0]
- Device: [e.g., iPhone 14, Samsung Galaxy S23]

## Additional Context
Any other relevant information
```

## 💡 Feature Requests

### Feature Request Process
1. Check existing feature requests
2. Create detailed proposal
3. Discuss with maintainers
4. Implement after approval

### Feature Request Template
```markdown
## Feature Description
Clear description of the proposed feature

## Problem Statement
What problem does this solve?

## Proposed Solution
How should this be implemented?

## Alternatives Considered
Other approaches considered

## Additional Context
Any other relevant information
```

## 🚀 Release Process

### Version Numbering
- **Major**: Breaking changes (v2.0.0)
- **Minor**: New features (v1.1.0)
- **Patch**: Bug fixes (v1.0.1)

### Release Checklist
- [ ] All tests pass
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Version numbers bumped
- [ ] Security scan completed
- [ ] Performance testing done

## 🤝 Community Guidelines

### Code of Conduct
- Be respectful and inclusive
- Provide constructive feedback
- Help others learn and grow
- Follow project guidelines

### Communication
- Use GitHub issues for bug reports
- Use GitHub discussions for questions
- Be clear and concise in communications
- Provide context and examples

## 📞 Getting Help

### Resources
- [Documentation](docs/)
- [API Reference](docs/api/)
- [Troubleshooting Guide](docs/troubleshooting.md)
- [FAQ](docs/faq.md)

### Contact
- GitHub Issues: Bug reports and feature requests
- GitHub Discussions: Questions and general discussion
- Email: maintainers@sams-monitoring.com

## 🏆 Recognition

### Contributors
All contributors will be recognized in:
- README.md contributors section
- Release notes
- Annual contributor highlights

### Contribution Types
- Code contributions
- Documentation improvements
- Bug reports and testing
- Feature suggestions
- Community support

Thank you for contributing to SAMS! Your efforts help make this project better for everyone. 🎉
