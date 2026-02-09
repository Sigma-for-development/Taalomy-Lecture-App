import React from 'react';
import Head from 'expo-router/head';

type SeoHeadProps = {
  title?: string;
  description?: string;
  path?: string;
  index?: boolean;
};

const SITE_URL = 'https://lecturer.taalomy.com';
const DEFAULT_TITLE = 'Taalomy Lecturer App';
const DEFAULT_DESCRIPTION =
  'Taalomy Lecturer is the all-in-one platform for lecturers to manage classes, attendance, student communication, and learning workflows.';
const DEFAULT_IMAGE = `${SITE_URL}/og.png`;

export const SeoHead: React.FC<SeoHeadProps> = ({
  title,
  description = DEFAULT_DESCRIPTION,
  path = '/',
  index = true,
}) => {
  const fullTitle = title ? `${title} | ${DEFAULT_TITLE}` : DEFAULT_TITLE;
  const url = `${SITE_URL}${path}`;
  const robots = index ? 'index,follow' : 'noindex,follow';

  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        name: 'Taalomy',
        url: SITE_URL,
        logo: DEFAULT_IMAGE,
      },
      {
        '@type': 'WebSite',
        name: DEFAULT_TITLE,
        url: SITE_URL,
        potentialAction: {
          '@type': 'SearchAction',
          target: `${SITE_URL}/?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'WebApplication',
        name: DEFAULT_TITLE,
        url: SITE_URL,
        applicationCategory: 'EducationalApplication',
        operatingSystem: 'Web',
        description,
      },
    ],
  };

  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={robots} />
      <link rel="canonical" href={url} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={DEFAULT_IMAGE} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={DEFAULT_IMAGE} />
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Head>
  );
};
