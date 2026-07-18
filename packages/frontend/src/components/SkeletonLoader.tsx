import React from 'react';

interface SkeletonLoaderProps {
  className?: string;
  width?: string;
  height?: string;
  borderRadius?: string;
  count?: number;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  className = '',
  width = '100%',
  height = '1rem',
  borderRadius = '0.25rem',
  count = 1
}) => {
  const skeletons = Array.from({ length: count }, (_, i) => (
    <div
      key={i}
      className={`animate-pulse bg-gray-200 dark:bg-gray-700 ${className}`}
      style={{ width, height, borderRadius, marginBottom: i < count - 1 ? '0.5rem' : '0' }}
    />
  ));

  return <>{skeletons}</>;
};
