import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';
import { robotsMetaContent } from '@/utils/noindexMeta';

export default function Root({ children }: PropsWithChildren) {
  const robots = robotsMetaContent();

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        {robots ? <meta name="robots" content={robots} /> : null}
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
