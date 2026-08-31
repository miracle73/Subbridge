<div align="center">

# SubBridge

**Your all-in-one bill payment platform**

Airtime | Data | Cable TV | Electricity

[![Expo](https://img.shields.io/badge/Expo-SDK_53-000020?style=for-the-badge&logo=expo)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React_Native-0.79-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://reactnative.dev)
[![EAS Build](https://img.shields.io/badge/EAS_Build-Ready-4630EB?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/eas)

</div>

---

## About

SubBridge is a mobile bill payment application built with React Native (Expo). It allows users to purchase airtime, buy data bundles, subscribe to cable TV, and pay electricity bills — all from a single wallet. Users fund their wallet via bank transfer using a virtual account, then spend across multiple bill payment services instantly.

## Features

### Airtime
- Buy airtime for all Nigerian networks (MTN, Airtel, Glo, 9mobile)
- Instant delivery to any phone number
- Save beneficiaries for quick recharges

### Data
- Purchase data bundles for all networks
- Multiple plan types: SME, Gifting, and Corporate
- Plans available in Daily, Weekly, Monthly, and Yearly options
- Beneficiary support for repeat purchases

### Cable TV
- Subscribe to DStv, GOtv, and StarTimes
- Smartcard verification before purchase
- View current plan and subscriber name
- All available packages per provider

### Electricity
- Pay electricity bills for 11 distribution companies (Ikeja Electric, EKEDC, IBEDC, IKEDC, Abuja Electric, Kano Electric, Jos Electric, Benin Electric, Kaduna Electric, Yola Electric)
- Prepaid and Postpaid meter types
- Meter verification to confirm account details before payment

### Wallet
- Fund wallet via bank transfer to virtual account
- Real-time balance display
- Full transaction history with filtering

### Security
- 4-digit PIN authentication
- Biometric (fingerprint) authentication support
- Automatic app lock when backgrounded (1+ second)
- Session management with secure token storage

### Other
- Onboarding flow for new users
- Transaction history with detailed receipts
- PDF receipt generation and sharing
- Profile management (edit name, change PIN)
- Pull-to-refresh on all data screens
- Contact picker for beneficiary selection
- Support page with FAQs and contact options (WhatsApp, email, phone)

## Tech Stack

| Technology | Purpose |
|------------|---------|
| Expo SDK 53 | Development framework |
| React Native 0.79 | Mobile UI |
| React Navigation 7 | Navigation (Stack + Bottom Tabs) |
| Expo SecureStore | Secure token/PIN storage |
| Expo Local Authentication | Biometric auth |
| Expo Contacts | Contact picker |
| Expo Linear Gradient | UI gradients |
| Expo Haptics | Touch feedback |
| Expo Print / Sharing | PDF receipt generation |
| React Native SVG | Icons and graphics |

## Project Structure

```
subbridge/
├── App.js                          # Root component (auth lock, navigation)
├── app.json                        # Expo configuration
├── eas.json                        # EAS Build profiles
├── src/
│   ├── assets/                     # Logos, images, splash screen
│   ├── components/                 # Reusable UI components
│   │   ├── AuthLock.js             # PIN lock screen
│   │   ├── BeneficiaryBox.js       # Saved beneficiary display
│   │   ├── ErrorBoundary.js        # Error catcher
│   │   ├── PinDots.js              # PIN input dots
│   │   ├── PinPad.js               # Numeric PIN pad
│   │   ├── Preloader.js            # Loading spinner
│   │   ├── ProcessingOverlay.js    # Processing animation
│   │   ├── ReceiptModal.js         # Receipt bottom sheet
│   │   └── ServiceBanner.js        # Promotional banner
│   ├── navigation/
│   │   └── AppNavigator.js         # All routes and tab navigator
│   ├── screens/
│   │   ├── SplashScreen.js         # App launch screen
│   │   ├── OnboardingScreen.js     # 3-page onboarding
│   │   ├── AuthScreen.js           # Login/signup entry
│   │   ├── HomeScreen.js           # Dashboard with balance, services, recent tx
│   │   ├── ReceiptScreen.js        # Transaction receipt
│   │   ├── auth/
│   │   │   ├── SignUpScreen.js     # Registration
│   │   │   ├── SignInScreen.js     # Email/password login
│   │   │   ├── PinSignInScreen.js  # PIN-based login
│   │   │   ├── ForgotPasswordScreen.js
│   │   │   ├── VerifyOtpScreen.js
│   │   │   └── ResetPasswordScreen.js
│   │   ├── services/
│   │   │   ├── AirtimeScreen.js    # Airtime purchase
│   │   │   ├── DataScreen.js       # Data bundle purchase
│   │   │   ├── CableTvScreen.js    # Cable TV subscription
│   │   │   ├── ElectricityScreen.js # Electricity payment
│   │   │   └── MoreScreen.js       # Additional services
│   │   ├── wallet/
│   │   │   └── WalletScreen.js     # Wallet balance & funding
│   │   ├── transactions/
│   │   │   └── TransactionsScreen.js # Full transaction history
│   │   ├── profile/
│   │   │   ├── ProfileScreen.js    # User profile
│   │   │   ├── EditProfileScreen.js # Edit name/email
│   │   │   └── ChangePinScreen.js  # Change PIN
│   │   └── support/
│   │       └── SupportScreen.js    # FAQs and contact
│   ├── services/
│   │   └── api.js                  # API service layer
│   └── utils/
│       ├── format.js               # Currency/date formatting
│       ├── logos.js                # Logo references
│       ├── mockData.js             # Mock data for development
│       ├── storage.js              # SecureStore wrapper
│       └── theme.js                # Colors, fonts, spacing, radii
```

## API

The app connects to a REST API at `https://subbridge.connectbridge.com.ng`.

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/sign-up/` | Register new account |
| POST | `/api/sign-in-user/` | Login with phone + password |
| POST | `/api/sign-in-with-pin/` | Login with phone + PIN |
| POST | `/api/verify-pin/` | Verify PIN |
| POST | `/api/logout/` | Logout |
| POST | `/api/forgot-password/` | Request password reset |
| POST | `/api/verify-otp/` | Verify OTP code |
| POST | `/api/reset-password/` | Reset password |
| GET | `/api/users/{id}/` | Get user profile |
| PUT | `/api/users/{id}/` | Update user profile |
| GET | `/api/wallet/{id}/` | Get wallet balance |
| GET | `/api/wallet/{id}/transactions/` | Get wallet transactions |
| GET | `/api/transactions/{id}/` | Get transaction history |
| GET | `/api/transactions/recent/` | Get recent transactions |
| GET | `/api/data/providers/` | List data providers |
| GET | `/api/data/plans/` | List data plans by provider |
| POST | `/api/data/purchase/` | Purchase data bundle |
| GET | `/api/cable/providers/` | List cable providers |
| GET | `/api/cable/plans/` | List cable plans by provider |
| POST | `/api/cable/verify/` | Verify smartcard number |
| POST | `/api/cable/purchase/` | Purchase cable subscription |
| GET | `/api/electricity/providers/` | List electricity providers |
| POST | `/api/electricity/verify/` | Verify meter number |
| POST | `/api/electricity/purchase/` | Purchase electricity token |
| POST | `/api/change-pin/` | Change account PIN |
| GET | `/api/support/` | Get support info |
| GET | `/api/banks/` | List banks |

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app on your phone (SDK 53)

### Installation

```bash
git clone https://github.com/Radnidev1/subbridge.git
cd subbridge
npm install
```

### Run locally

```bash
npx expo start
```

Scan the QR code with Expo Go on your phone.

### Build APK

```bash
npx eas build -p android --profile preview
```

### Build AAB (Play Store)

```bash
npx eas build -p android --profile production
```

## Configuration

The app is configured for:
- **Owner**: `devradni`
- **EAS Project ID**: `3e57fb7f-7550-440e-89ec-e30ac0d560a2`
- **Android Package**: `com.subbridge.app`
- **iOS Bundle**: `com.subbridge.app`
- **Min SDK**: 24 (Android 7.0)
- **Target SDK**: 36

### Permissions

| Permission | Purpose |
|------------|---------|
| `USE_BIOMETRIC` | Fingerprint authentication |
| `USE_FINGERPRINT` | Fingerprint authentication (legacy) |
| `VIBRATE` | Haptic feedback |
| `READ_CONTACTS` | Contact picker for beneficiaries |
| `WRITE_CONTACTS` | Save beneficiaries to contacts |
| `POST_NOTIFICATIONS` | Push notifications |

## License

Private — All rights reserved.
