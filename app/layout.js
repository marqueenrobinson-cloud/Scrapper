export const metadata = {
  title: "Clip Agent",
  description: "Turn YouTube transcripts into clippable moments.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}

