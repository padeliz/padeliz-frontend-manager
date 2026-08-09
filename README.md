<img src="https://github.com/user-attachments/assets/6ea788c4-f033-45b8-8701-bae663d57119" width="400">

## Padeliz Manager

Expo-based app for https://manager.padeliz.ro

## Development Setup (Windows)

Expo is a React framework for universal native apps — write once for iOS, Android, and web with fast, joyful iteration.

### Prerequisites

- [Git](https://git-scm.com/downloads)
- [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/)
- WSL2 enabled (Windows Subsystem for Linux)
- [VS Code](https://code.visualstudio.com/) with the "Dev Containers" extension
- [Google Cloud Console](https://console.cloud.google.com) project with OAuth 2.0 credentials
- [Apple Developer Account](https://developer.apple.com/account/)

### First-time setup

1. **Install VS Code + “Dev Containers” extension**

2. **Clone the repository**

   ```bash
   ## in the VSCode terminal
   git clone https://github.com/padeliz/padeliz-frontend-manager.git
   ```

3. **Open the repository folder in VS Code**

4. **Open the Command Palette and run "Dev Containers: Reopen in Container"**

   Press CTRL + P and type `> Dev Containers: Reopen in Container`
   - This will open a new window in which the container is initialized.
   - You're now editing the files directly in the Docker.

5. **Install Dependencies**

   _No need to do it manually._

   _Wait for the container to build and finish the automatic dependency installation._

6. **Environment Setup**
   ```bash
   # Copy the environment file
   copy .env.local.example .env.local
   ```

### Useful Commands

Press CTRL+` inside VSCode to open the terminal. Make sure you're inside the dev container.

```bash
## run the app (CI=true, some features disabled)
npm start

## run the app (CI-false, all features enabled, including QR code)
CI=false npm start
```

### Testing

Unit and component tests use Jest, jest-expo, and React Native Testing Library (RNTL v13).

```bash
## run unit/component tests once
npm test

## watch mode
npm run test:watch

## CI-style single run (no coverage gate)
npm run test:ci
```

### Project Structure

- `/app` - Main application code using file-based routing
- `/app/api` - Backend API routes (BFF)
  - `/auth` - Authentication endpoints
  - `/public` - Public endpoints
  - `/protected` - Protected endpoints requiring JWT
- `/components` - Reusable React components
- `/utils` - Utility functions and middleware

### Troubleshooting

1. **Port Conflicts**
   - If port 8083 is already in use, modify the ports in `docker-compose.yml`

2. **Docker Issues**
   - Ensure Docker Desktop is running
   - Try restarting Docker Desktop
   - Check WSL2 is properly installed: `wsl --status`

3. **Permission Issues**
   - Run Docker Desktop as administrator
   - Ensure proper file permissions in WSL

## Contributing

1. Create a new branch for your feature

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes and test them

3. Commit

   ```bash
   git add .
   git commit -m "Description of changes"
   ```

4. Push to your branch

   ```bash
   git push origin feature/your-feature-name
   ```

5. Create a Pull Request on GitHub

## Learn More

About Expo:

- [Expo documentation](https://docs.expo.dev/)
- [Expo on GitHub](https://github.com/expo/expo)

About auth:

- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [JWT.io](https://jwt.io/)
- [Sign in with Apple](https://developer.apple.com/sign-in-with-apple/)

Useful Youtube Videos:

- <a href="https://youtu.be/V2YdhR1hVNw">Expo OAuth with Google</a>
- <a href="https://youtu.be/tqxTijhYhp8">Expo Sign in with Expo</a>

## License

This project is private. All rights reserved.
