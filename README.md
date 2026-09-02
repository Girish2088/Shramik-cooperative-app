# Shramik - Cooperative Digital Service Marketplace

A cooperative-owned digital service marketplace built with React Native and Firebase, designed to connect skilled workers with households while ensuring fair wages, worker welfare, and consumer trust.

## 🎯 The Core Problem We Are Solving

In the current gig economy and unorganized sector, daily wage workers and skilled laborers face three major challenges:
1. **Exploitative Middlemen:** Private platforms and local contractors take steep commissions (20% to 30%) from the worker's hard-earned daily wage.
2. **Lack of Social Security:** Gig workers operate without a safety net—no health insurance, provident fund (PF), or job security. 
3. **Lack of Digital Identity:** Workers rely on standing at physical *Labour Chowks* (street corners) to find daily work, struggling to prove their skills or build trust with new customers.

## 💡 The Solution (The Shramik Advantage)

We built a **"Digital Labour Chowk"** powered by Cooperative Societies. Instead of a tech company exploiting workers for profit, our platform is a cooperative-first ecosystem where:
* **100% Earnings to the Worker:** By utilizing native UPI deep-linking, payments go directly from the user to the worker's bank account with **zero commission fees**.
* **Worker Welfare Integrated:** The provider dashboard tracks actual benefits like Cooperative Dividends, PF, and Health Insurance, ensuring long-term financial safety.
* **Verified Dignity:** By linking workers to local Labour Unions for manual verification, they receive a "Co-op Verified" badge, building instant consumer trust and allowing them to charge fair rates based on their digital ratings.

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

## 🛠️ Get Started

1. **Install dependencies:**
   ```bash
   npm install
