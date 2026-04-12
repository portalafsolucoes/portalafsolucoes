'use client'

import { useEffect, useState } from 'react'
import type { ProductRecord, ProductSlug } from '@/lib/products'

export function useCompanyProducts() {
  const [products, setProducts] = useState<ProductRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch('/api/products')
      .then(r => r.json())
      .then(json => {
        setProducts(json.data ?? [])
      })
      .catch(() => {
        setProducts([])
      })
      .finally(() => setIsLoading(false))
  }, [])

  function isProductEnabled(slug: ProductSlug): boolean {
    const p = products.find(p => p.slug === slug)
    return p?.enabled === true
  }

  return { products, isLoading, isProductEnabled }
}
