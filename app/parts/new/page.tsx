'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PartModal from '@/components/parts/PartModal';

export default function NewPartPage() {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(true);

  const handleClose = () => {
    setIsModalOpen(false);
    router.push('/parts');
  };

  return (
    <>
      {isModalOpen && (
        <PartModal
          part={null}
          onClose={handleClose}
        />
      )}
    </>
  );
}
