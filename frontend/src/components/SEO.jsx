// frontend/src/components/SEO.jsx
import React from 'react';
import { Helmet } from 'react-helmet-async';

const SEO = ({ 
  title, 
  description, 
  keywords, 
  image, 
  url, 
  type = 'website',
  author = 'OS Zdravlja',
  publishedTime,
  modifiedTime,
  articleSection,
  tags = []
}) => {
  const siteTitle = 'OS Zdravlja – Operativni sistem za tvoje zdravlje';
  const siteUrl = 'https://os-zdravlja.vercel.app';
  const defaultImage = `${siteUrl}/icons/icon-512.png`;
  const defaultDescription = 'Otkrivajte recepte prilagođene vašim potrebama, dijetama i ukusu. AI Chef, Food Planner, HealthyChef i još mnogo toga!';

  const metaTitle = title ? `${title} | ${siteTitle}` : siteTitle;
  const metaDescription = description || defaultDescription;
  const metaImage = image || defaultImage;
  const metaUrl = url || siteUrl;

  return (
    <Helmet>
      {/* Osnovni meta tagovi */}
      <title>{metaTitle}</title>
      <meta name="description" content={metaDescription} />
      <meta name="keywords" content={keywords || 'recepti, zdrava hrana, AI Chef, Food Planner, personalizirani recepti, OS Zdravlja, healthy recipes, dijetalni recepti'} />
      <meta name="author" content={author} />
      
      {/* Robots */}
      <meta name="robots" content="index, follow" />
      <meta name="googlebot" content="index, follow" />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={metaTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:image" content={metaImage} />
      <meta property="og:url" content={metaUrl} />
      <meta property="og:site_name" content="OS Zdravlja" />
      <meta property="og:locale" content="hr_HR" />
      
      {/* Twitter Cards */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={metaTitle} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:image" content={metaImage} />
      <meta name="twitter:site" content="@oszdravlja" />
      
      {/* Članak - specifični tagovi */}
      {type === 'article' && (
        <>
          <meta property="article:published_time" content={publishedTime} />
          <meta property="article:modified_time" content={modifiedTime || publishedTime} />
          <meta property="article:section" content={articleSection || 'Recepti'} />
          {tags.map((tag, i) => (
            <meta key={i} property="article:tag" content={tag} />
          ))}
        </>
      )}
      
      {/* Dodatni meta tagovi */}
      <meta name="theme-color" content="#2563eb" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      
      {/* Canonical URL */}
      <link rel="canonical" href={metaUrl} />
      
      {/* Structured Data - JSON-LD */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          "name": "OS Zdravlja",
          "url": siteUrl,
          "description": metaDescription,
          "potentialAction": {
            "@type": "SearchAction",
            "target": {
              "@type": "EntryPoint",
              "urlTemplate": `${siteUrl}/recipes?search={search_term_string}`
            },
            "query-input": "required name=search_term_string"
          }
        })}
      </script>
    </Helmet>
  );
};

export default SEO;