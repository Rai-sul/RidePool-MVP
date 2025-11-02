# CI/CD Setup Guide

## Overview
This repository includes a complete CI/CD pipeline with:
- ✅ Automated builds for Client & Server
- ✅ Code quality & security checks
- ✅ Dependency updates via Dependabot
- ✅ CodeQL security analysis
- 🔄 Expo preview builds (needs configuration)
- 🔄 Deployment automation (needs configuration)

## Quick Start

### 1. Enable GitHub Actions
Actions should be enabled by default. Verify at:
`https://github.com/Ahsaniat/Carpool-dev/actions`

### 2. Configure Branch Protection (GitHub Pro)
Go to: `Settings` → `Branches` → `Add rule` for `main`:
- ✅ Require pull request reviews before merging
- ✅ Require status checks to pass before merging
  - Select: `client-build`, `server-build`, `code-quality`
- ✅ Require conversation resolution before merging
- ✅ Include administrators (optional)

### 3. Enable CodeQL Security Analysis
Go to: `Settings` → `Code security and analysis`
- Enable: `Dependency graph`
- Enable: `Dependabot alerts`
- Enable: `Dependabot security updates`
- Enable: `Code scanning` (CodeQL analysis)

### 4. Setup Expo EAS (Optional - for mobile builds)
```bash
cd Client/CarPoolApp

# Login to Expo
npm install -g eas-cli
eas login

# Configure EAS
eas build:configure

# Create access token for GitHub Actions
eas whoami
# Go to: https://expo.dev/accounts/[account]/settings/access-tokens
# Create a new token and add it to GitHub Secrets as EXPO_TOKEN
```

Add to GitHub Secrets: `Settings` → `Secrets and variables` → `Actions` → `New repository secret`:
- Name: `EXPO_TOKEN`
- Value: `[expo-token-from-web]`

Then uncomment the EAS build commands in:
- `.github/workflows/ci.yml` (line 97)
- `.github/workflows/expo-preview.yml` (line 48-49)

### 5. Setup Deployment (Optional)
Edit `.github/workflows/ci.yml` and configure the `deploy-server` job:

**For AWS/Heroku/DigitalOcean:**
Add these secrets:
- `DEPLOY_HOST`
- `DEPLOY_USER`
- `DEPLOY_KEY` (SSH private key)

**For Docker:**
Add these secrets:
- `DOCKER_USERNAME`
- `DOCKER_PASSWORD`
- `DOCKER_REGISTRY`

### 6. Environment Protection (GitHub Pro)
Go to: `Settings` → `Environments` → `New environment`:
- Name: `production`
- Protection rules:
  - ✅ Required reviewers (select team members)
  - ✅ Wait timer: 5 minutes
  - ✅ Deployment branches: `main` only

## Workflow Overview

### Main CI/CD Pipeline (`ci.yml`)
**Triggers:** Push to `main`/`develop`, Pull Requests

**Jobs:**
1. **client-build**: Builds React Native Expo web version
2. **server-build**: Builds Node.js TypeScript server
3. **android-build**: Creates Android APK (main branch only)
4. **code-quality**: Security audits & dependency reviews
5. **deploy-server**: Deploys to production (main branch only)

### Expo Preview (`expo-preview.yml`)
**Triggers:** Pull Requests affecting Client/CarPoolApp

Creates preview builds for testing on physical devices via Expo Go.

### CodeQL Security (`codeql.yml`)
**Triggers:** Push, Pull Requests, Weekly schedule

Automated security vulnerability scanning.

### Dependabot (`dependabot.yml`)
**Schedule:** Weekly

Automated dependency updates with grouped PRs.

## Required Secrets

### For Expo Builds:
- `EXPO_TOKEN`: Expo access token

### For Deployment (configure based on your setup):
- `DEPLOY_HOST`: Server hostname/IP
- `DEPLOY_USER`: SSH username
- `DEPLOY_KEY`: SSH private key
- `DEPLOY_PATH`: Deployment directory path

### For Docker (if using):
- `DOCKER_USERNAME`
- `DOCKER_PASSWORD`
- `DOCKER_REGISTRY`

## Badges (Optional)
Add to your README.md:

```markdown
![CI/CD Pipeline](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/ci.yml/badge.svg)
![CodeQL](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/codeql.yml/badge.svg)
```

## Workflow Files

- `.github/workflows/ci.yml` - Main CI/CD pipeline
- `.github/workflows/expo-preview.yml` - PR preview builds
- `.github/workflows/codeql.yml` - Security analysis
- `.github/dependabot.yml` - Dependency updates

## Local Testing
Test workflows locally with [act](https://github.com/nektos/act):
```bash
# Install act
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash

# Run workflows
act push
act pull_request
```

## Resources
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Expo EAS Build](https://docs.expo.dev/build/introduction/)
- [CodeQL Documentation](https://codeql.github.com/docs/)
- [Dependabot Documentation](https://docs.github.com/en/code-security/dependabot)

## Troubleshooting

### Build Failures
- Check workflow logs in Actions tab
- Ensure all dependencies are in package.json
- Verify Node.js version compatibility

### Expo Build Issues
- Verify EXPO_TOKEN is correct
- Check EAS configuration: `eas.json`
- Review Expo build logs

### Deployment Issues
- Verify all secrets are configured
- Check SSH key permissions (600)
- Ensure deployment directory exists

## Future Steps

1. Push this configuration to GitHub
2. Check Actions tab for first workflow run
3. Configure branch protection rules
4. Setup Expo EAS for mobile builds
5. Configure deployment target
6. Add status badges to README


