# Contributing to ASCENT-Backend

First off, thanks for taking the time to contribute!

The following is a set of guidelines for contributing to ASCENT-Backend. These are mostly guidelines, not rules. Use your best judgment, and feel free to propose changes to this document in a pull request.

## Code of Conduct

This project and everyone participating in it is governed by a Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## How Can I Contribute?

### Reporting Bugs

This section guides you through submitting a bug report. Following these guidelines helps maintainers and the community understand your report, reproduce the behavior, and find related reports.

- **Use a clear and descriptive title** for the issue to identify the problem.
- **Describe the steps to reproduce the problem** in as much detail as possible.
- **Describe what you expected to happen**.
- **Describe what actually happened**.

### Suggesting Enhancements

Suggesion for enhancements are welcome!

- **Use a clear and descriptive title** for the issue to identify the suggestion.
- **Provide a step-by-step description of the suggested enhancement** in as much detail as possible.
- **Explain why this enhancement would be useful** to most users.

### Pull Requests

1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests (if a test suite exists).
3. Ensure the test suite passes.
4. Make sure your code lints.
5. Create a Pull Request.

## Local Development Style Guide

- **Naming Conventions**: Use `camelCase` for variables and functions. Use `PascalCase` for Models (e.g., `User.js`, `Split.js`).
- **File Structure**: Keep logic separated. 
    - Routes in `routes/`
    - Logic/Handlers in `controllers/`
    - Database Schemas in `models/`
    - Business Logic/Services in `services/`
- **Formatting**: Attempt to follow existing code formatting (indentation, semicolons, etc.).

## Commit Messages

- Use the present tense ("Add feature" not "Added feature").
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...").
- Limit the first line to 72 characters or less.
- Reference issues and pull requests liberally after the first line.
