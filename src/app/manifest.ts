import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Bassatine Facturation',
    short_name: 'Bassatine',
    description: 'Application de facturation pour Bassatine Skoura',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#ea580c', // Orange-600
    icons: [
      {
        src: '/bassatine-logo.png',
        sizes: '240x80',
        type: 'image/png',
      },
    ],
  }
}
