export const viewport = {
  themeColor: "#008080",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata = {
  title: "Scrabble Pro Solver",
  description: "A Windows 98-themed Scrabble Engine and Board Analyzer",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ScrabblePro",
  },
};

export default function ScproLayout({ children }) {
  return <>{children}</>;
}
