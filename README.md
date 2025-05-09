# Mechielsen Hydraulic Hose Connection Guide

A modern web application that guides users through connecting hydraulic hoses using NFC technology. Built with Next.js, Supabase, and a comprehensive UI component library.

## Features

- Interactive hose connection guidance
- NFC tag scanning and validation
- Real-time connection status updates
- Modern, responsive UI
- Secure authentication
- Data persistence with Supabase

## Tech Stack

- **Frontend**: Next.js 15.3.1 with React 19
- **UI Components**: Radix UI
- **Styling**: Tailwind CSS
- **Backend**: Supabase
- **Form Handling**: React Hook Form with Zod validation
- **State Management**: React Hooks
- **Icons**: Lucide React
- **Charts**: Recharts
- **Notifications**: Sonner

## Prerequisites

- Node.js 18.0.0 or higher
- npm 9.0.0 or higher
- Git

## Installation

1. Clone the repository:
```bash
git clone [your-repository-url]
cd mechielsen_webapp
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file in the root directory with the following variables:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Project Structure

```
mechielsen_webapp/
├── app/              # Next.js app directory
├── components/       # React components
├── lib/             # Utility functions and configurations
├── public/          # Static assets
└── styles/          # Global styles
```

## Contributing

1. Create a new branch for your feature
2. Make your changes
3. Submit a pull request

## License

[Your License]

## Support

For support, please [contact details or support channels]

## Usage

1. Connect to the web application on your phone
2. Follow the on-screen instructions to scan NFC tags
3. View connection points and configuration settings
4. Complete all hose connections as guided

## Architecture

- Frontend: Next.js web application
- Backend: Flask server
- Hardware: Raspberry Pi Pico W with PN532 NFC reader

## API Endpoints

- `/nfc-status`: Check if an NFC tag is detected
- `/config`: Get configuration settings for the current setup
