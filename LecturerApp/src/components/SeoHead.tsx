import React from 'react';
import Head from 'expo-router/head';

type SeoHeadProps = {
  title?: string;
  description?: string;
  keywords?: string;
  path?: string;
  index?: boolean;
};

const SITE_URL = 'https://lecturer.taalomy.com';
const DEFAULT_TITLE = 'Taalomy Lecturer | Manage Classes & Students';
const DEFAULT_DESCRIPTION =
  'Taalomy Lecturer is the professional platform for teachers and lecturers to manage classes, attendance, exams, and student communication in one place.';
const DEFAULT_KEYWORDS = 'lecturer app, class management, attendance tracker, student communication, educational platform, Taalomy, teaching tools';
const DEFAULT_IMAGE = `${SITE_URL}/og.png`;

export const SeoHead: React.FC<SeoHeadProps> = ({
  title,
  description = DEFAULT_DESCRIPTION,
  keywords = DEFAULT_KEYWORDS,
  path = '/',
  index = true,
}) => {
  const fullTitle = title ? `${title} | Taalomy Lecturer` : DEFAULT_TITLE;
  const url = `${SITE_URL}${path}`;
  const robots = index ? 'index,follow' : 'noindex,follow';

  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: 'Taalomy',
        url: SITE_URL,
        logo: {
          '@type': 'ImageObject',
          url: DEFAULT_IMAGE,
        },
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        name: 'Taalomy Lecturer',
        url: SITE_URL,
        publisher: { '@id': `${SITE_URL}/#organization` },
        potentialAction: {
          '@type': 'SearchAction',
          target: `${SITE_URL}/?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'SoftwareApplication',
        name: 'Taalomy Lecturer',
        applicationCategory: 'EducationalApplication',
        operatingSystem: 'Web, Android, iOS',
        description: DEFAULT_DESCRIPTION,
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD'
        }
      },
      {
        '@type': 'BreadcrumbList',
        'itemListElement': [
          {
            '@type': 'ListItem',
            'position': 1,
            'name': 'Home',
            'item': SITE_URL
          },
          path !== '/' && {
            '@type': 'ListItem',
            'position': 2,
            'name': title || 'Page',
            'item': url
          }
        ].filter(Boolean)
      }
    ],
  };

  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
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
