import React from 'react';

interface Props {
  children: React.ReactNode;
  withBottomNav?: boolean;
}

// Provides safe-area padding and bottom spacing when a bottom nav is present
const ResponsiveContainer: React.FC<Props> = ({ children, withBottomNav }) => {
  return (
    <div
      className="min-h-screen bg-gray-50"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
        paddingBottom: `calc(env(safe-area-inset-bottom) + ${withBottomNav ? '60px' : '0px'})`,
      }}
    >
      {children}
    </div>
  );
};

export default ResponsiveContainer;
