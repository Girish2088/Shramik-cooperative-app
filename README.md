# Shramik - Cooperative Digital Service Marketplace

A cooperative-owned digital service marketplace built with React Native and Firebase, designed to connect skilled workers with households while ensuring fair wages, worker welfare, and consumer trust.

## 🚀 Tech Stack
* **Frontend:** React Native, Expo
* **Backend:** Firebase (Authentication, Cloud Firestore)
* **Payments:** Native UPI Deep Linking (Zero Commission)
* **Localization:** `react-i18next` (English & Hindi)

## ✨ Key Features
* **Role-Based Architecture:** Dedicated interfaces and routing for Users, Service Providers, and Cooperative Admins.
* **Cooperative Verification:** Workers select their local union during signup, and Admins must manually verify credentials before providers go live.
* **SOS Emergency Mode:** Users can instantly filter the real-time database for on-demand, emergency-ready service providers.
* **Worker Welfare Hub:** A dedicated dashboard for providers tracking PF, health insurance, and cooperative dividends to protect unorganized labor.
* **Direct UPI Payments:** Direct peer-to-peer UPI payment handoff using native app intents, bypassing expensive payment gateways.
* **Multi-Skill Smart Sorting:** Providers can list multiple skills, and search results are dynamically sorted by distance and post-job ratings.



## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
