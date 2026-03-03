# Contributing to Withmia

Thank you for your interest in contributing to Withmia! This guide will help you get started.

## Code of Conduct

Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before contributing.

## How to Contribute

### Reporting Bugs

1. Check [existing issues](https://github.com/withmia/withmia/issues) first
2. Create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable
   - Environment details (OS, PHP version, Node version)

### Suggesting Features

Open a [Discussion](https://github.com/withmia/withmia/discussions) with your idea before creating a PR.

### Pull Requests

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run tests: `php artisan test`
5. Run linting: `npm run lint` and `composer run pint`
6. Commit with clear messages: `git commit -m "feat: add new calendar integration"`
7. Push and open a PR against `main`

## Development Setup

`ash
git clone https://github.com/YOUR_USERNAME/withmia.git
cd withmia
composer install
npm install
cp .env.example .env
php artisan key:generate
php artisan migrate
npm run dev   # Frontend dev server
php artisan serve  # Backend dev server
`

## Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Formatting (no code change)
- `refactor:` Code restructuring
- `test:` Adding tests
- `chore:` Maintenance

## Project Structure

- **Backend**: Laravel 12 (PHP 8.3) in `app/`
- **Frontend**: React + TypeScript in `resources/js/`
- **Config**: Service configs in `config/`
- **Database**: Migrations in `database/migrations/`

## Need Help?

- [GitHub Discussions](https://github.com/withmia/withmia/discussions)
- [GitHub Issues](https://github.com/withmia/withmia/issues)

Thank you for helping make Withmia better!
