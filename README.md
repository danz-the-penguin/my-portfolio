# Portfolio

A fast, minimal, and responsive personal portfolio built with Next.js and React. Features dynamic theme switching (Light/Dark mode), an interactive 3D WebGL globe background, equal-height card layouts, and click-to-copy contact utilities.

## Features

- **3D WebGL Background:** Interactive particle globe powered by COBE.
- **Theme Synchronization:** Seamless Light/Dark mode with `localStorage` persistence, system preference detection, and live `MutationObserver` state updates.
- **Responsive Layout:** Modular grid-based cards with automatic vertical alignment for technology tags.
- **Click-to-Copy Utility:** Instant email copying to clipboard with a floating status toast notification.
- **Zero Heavy UI Frameworks:** Built cleanly with native inline CSS-in-JS and custom React sub-components.

## Tech Stack

- **Framework:** Next.js (App Router) / React
- **Graphics:** COBE (WebGL Globe)
- **Styling:** CSS-in-JS (Custom Theme Variables)
- **Deployment:** Vercel

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Acknowledgments & Credits

This project stands on the shoulders of giants within the computer science and competitive Scrabble communities. A massive thank you to the following open-source projects, platforms, and algorithms that made this engine possible:

*   **Kamil Mielnik's Scrabble Solver:** A primary source of inspiration for this project. His excellent open-source Scrabble implementation provided a brilliant reference point for structuring modern, web-based board logic and UI interactions.
*   **Quackle:** The gold-standard open-source Scrabble AI. The endgame synergy weights and "superleaves" matrix used in this engine's heuristic evaluation were extracted directly from Quackle's pre-calculated strategy datasets.
*   **Woogles.io:** For providing an incredible open platform for competitive Scrabble. The opponent tile deduction mechanics and manual input workflows were heavily inspired by their interface, and their match logs provided invaluable testing data.
*   **Cross-Tables.com:** For maintaining an exhaustive public archive of Grandmaster `.gcg` tournament files, which serves as the foundational data for training Scrabble ML models.
*   **The GADDAG Data Structure:** Originally formulated by Steven A. Gordon, this deterministic acyclic finite state automaton is the architectural core of the move-generation algorithm, allowing for lightning-fast bidirectional word construction.
*   **Zobrist Hashing:** Implemented within the Transposition Table to cache board states in $O(1)$ time, allowing the Alpha-Beta pruning algorithm to instantly recognize and evaluate overlapping future board states. 
*   **PCG (Permuted Congruential Generator):** Used to implement a highly performant, math-based pseudo-random number generator directly within the WGSL Compute Shader to facilitate parallel Monte Carlo tile draws.
*   **localForage:** For providing the asynchronous IndexedDB wrapper that allows this application to auto-save massive, 40-turn deep undo/redo history trees without blocking the React UI thread.
*   **Hoyle Classic Board Games (Sierra On-Line):** A primary design inspiration for the customized, wooden Windows 98 aesthetic, blending rigid 90s OS architecture with a warm, physical board game feel.
