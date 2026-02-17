# Contributing to This Project

Thank you for considering contributing! Whether you're fixing a bug, suggesting a feature, or helping clean up the codebase, your input is appreciated.

---

## 🧭 Getting Started

1. **Fork the repository** and clone it locally.

2. **Create a new branch** from `main`:

```bash
git checkout -b feat/scope/concise-description
```

3. **Install dependencies:**

```bash
npm install
```

4. **Run pre-commit checks:**

```bash
npm run lint
npm run type-check
```

📁 Project Structure

- `lib/ai/tools`: AI tool definitions and integrations
- `pages/api`: API routes
- `components/`: UI components
- `lib/`: Authentication, Microsoft Graph, and utility modules

🧪 Local Development

You’ll need a .env file with the following environment variables (see [env.example](/env.sample)):

```ini
# Web client
AUTH0_DOMAIN=...
AUTH0_CLIENT_ID=...
AUTH0_CLIENT_SECRET=...

# Auth0 management API client
AUTH0_CLIENT_ID_MGMT=...
AUTH0_CLIENT_SECRET_MGMT=...
AUTH0_ISSUER_BASE_URL=...

AUTH0_SECRET=...
APP_BASE_URL=...
LITELLM_API_KEY=...
LITELLM_BASE_URL=...
LITELLM_MODEL=...
SALESFORCE_LOGIN_URL=...
DATABASE_URL=...
```

Start the dev server:

```bash
npm run dev
```

## ✅ Pull Request Guidelines

### PR Title Format

Use [Conventional Commits](https://www.conventionalcommits.org/) with required scopes:

```bash
<type>(<scope>): description
```

Types:

- `feat`: New feature
- `fix`: Bug fix
- `chore`: Minor maintenance
- `docs`: Documentation changes
- `refactor`: Code change that doesn’t fix a bug or add a feature
- `style`: Formatting only
- `test`: Adding or updating tests

Accepted Scopes:

- `auth`
- `calendar`
- `files`
- `mail`
- `ui`
- `ci`
- `deps`
- `ai`
- `infra`

Examples:

- `feat(ai): enable summarization tool`
- `fix(auth): handle token expiry edge case`
- `chore(ci): update Vercel deploy hook`

⚠️ PRs that do not follow this format may be rejected or require title changes.

## 🐛 Submitting an Issue

Please use the appropriate issue template when opening an issue:

- **Bug Report** — for problems or errors
- **Feature Request** — for proposing enhancements
- **Chore** — for maintenance tasks or tech debt

## 🚀 Deployment

Direct commits to `main` are not allowed. Create a PR to merge your changes into `main`.

## 🙌 Need Help?

If you run into issues or have questions, feel free to:

- Open a GitHub issue
- Contact a maintainer directly

Thanks again for helping improve this project!
