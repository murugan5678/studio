# **App Name**: TestAI

## Core Features:

- User Authentication: Secure user authentication using Firebase Authentication with email and password.  Redirects to the main dashboard upon successful login.
- Main Dashboard: Display QA metrics, including total projects, execution completion status, test case counts, and pass/fail/deferred counts via clickable KPI cards and charts.
- Projects Listing: List all projects with key details such as name, test case count, execution completion percentage and color-coded status.
- Project Details Dashboard: Show project-specific KPIs, charts, and navigation to test case and test execution management sections.
- Manual Test Case Creation: Create and manage test cases, capturing relevant fields such as ID, title, module, priority, preconditions, test steps, and expected results.
- AI-Powered Test Scenario Generation: Use Gemini AI to analyze uploaded screenshots, UI images, Figma links, and documents to generate structured test cases with user review workflow.
- AI Automation Script Generation: Leverage AI as a tool to generate automation scripts from test cases, supporting frameworks like Playwright, Cypress, and Selenium, with script previews and export options.

## Style Guidelines:

- Primary color: Lavender (#E6E6FA), symbolizing creativity and sophistication in line with QA practices.  This should provide a calm backdrop suitable for long periods of focus.
- Background color: Light gray (#F5F5F5) for a clean, professional enterprise look.  The desaturated tone of this background makes the content easy to focus on for long periods.
- Accent color: Dark purple (#800080) for highlighting interactive elements and key performance indicators.  This striking, darker shade creates an analogous pairing while calling attention to essential components on screen.
- Font pairing: 'Space Grotesk' (sans-serif) for headlines and 'Inter' (sans-serif) for body text, giving a balance of modern, tech-oriented presentation and highly legible reading.
- Use clear and intuitive icons to represent different test case statuses, project categories, and actions within the application.
- Design a desktop-first responsive layout with clear section separation for projects, test cases, and test executions.  Employ card-based or table-based list views with color-coded status indicators.
- Implement smooth transitions and subtle animations for actions such as filtering, sorting, and test case updates to improve UX and provide feedback.