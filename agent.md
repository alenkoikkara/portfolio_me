# Portfolio Agent Instructions & Guardrails

You are assisting the USER in building a stunning, modern portfolio web application. 
Your primary directive is to create a high-quality, professional, and visually impressive product.

## 1. Guardrails & Restrictions
* **No Hallucinations:** Do not invent APIs, libraries, or dependencies that do not exist. Always verify the existence of tools before incorporating them.
* **No Deviation:** Stick precisely to the defined architecture and design system. Do not introduce new frameworks or major architectural changes without explicit user approval.
* **Aesthetic Focus:** If a design looks basic or generic, it is a failure. Always prioritize visual excellence.
* **Atomic Changes:** When making changes, ensure they are logically grouped and atomic. Do not leave the codebase in a broken state.

## 2. Design & Aesthetics
* **Color Palette & Typography:** The USER will explicitly set and provide the specific fonts and color palettes. Ensure strict adherence to these provided values.
  * **Design Palette:**
    * Viewport Background: `#faf9f6`
* **Icons:** Use Remix Icon for all iconography.
* **Styling:** Implement rich aesthetics including smooth gradients, glassmorphism where appropriate, and subtle micro-animations for interactive elements (hover states, transitions).
* **Responsiveness:** All designs MUST be mobile-first and fully responsive across tablet and desktop viewports.

## 3. Coding Patterns
* **Modularity:** Keep components focused, reusable, and single-purpose.
* **Core Tech:** This is a React project. Use modern functional components, Hooks (e.g., `useState`, `useEffect`), and modern JavaScript (ES6+).
* **DOM Manipulation:** Avoid direct DOM manipulation. Rely on React's declarative state and ref system.
* **CSS Best Practices:** Always use Tailwind CSS utility classes for styling instead of writing custom CSS. Avoid writing custom CSS in stylesheets unless absolutely necessary (e.g., global base styles). Never use inline styles.

## 4. Linting & Formatting
* **Strict Mode:** Always write JavaScript in strict mode.
* **Code Cleanliness:** No unused variables, no dead code, and no unnecessary `console.log` statements in the final code.
* **Consistency:** Follow standard formatting rules. Ensure consistent indentation and quote usage throughout the project.

## 5. File Structure
Maintain a clean, organized project structure:
```text
/
├── public/          # Static assets (favicons, raw images)
├── src/
│   ├── assets/      # Processed assets (fonts, global images)
│   ├── components/  # Reusable React components
│   ├── styles/      # Global CSS and design tokens
│   ├── utils/       # Helper functions and utilities
│   ├── App.jsx      # Root component
│   └── main.jsx     # Application entry point
└── README.md
```

## 6. Documentation
* **Code Comments:** Write meaningful comments explaining *why* something is done, not *what* is done (unless the logic is highly complex).
* **Function Docs:** Use JSDoc-style comments for utility functions to ensure clear type definitions and usage instructions.
* **README:** Ensure the project `README.md` is kept up to date with setup instructions, tech stack details, and scripts.
