import type { Metadata } from 'next';
import './ui-styles/index.css';
export const metadata: Metadata = {
  title: 'Les Royaumes — Terre du Milieu',
  description: 'Bâtissez vos cités, faites prospérer votre royaume et rassemblez vos armées.',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
