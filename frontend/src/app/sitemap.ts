import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://www.lumeo.estgrp.in/',
      priority: 1.0,
    },
    {
      url: 'https://www.lumeo.estgrp.in/pricing',
      priority: 0.8,
    },
    {
      url: 'https://www.lumeo.estgrp.in/features',
      priority: 0.8,
    },
  ]
}
