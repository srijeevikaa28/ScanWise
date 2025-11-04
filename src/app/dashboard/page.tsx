'use client';
import { useState } from 'react';
import InventoryPage from '@/components/inventory-page';

export default function DashboardPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  return <InventoryPage refreshKey={refreshKey} />;
}
