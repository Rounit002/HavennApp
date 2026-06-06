
import React, { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: ReactNode;
  iconBgColor: string;
  textColor?: string;
  arrowIcon?: ReactNode;
  // New optional style overrides for colorful variants
  containerClassName?: string;
  titleClassName?: string;
  valueClassName?: string;
}

const StatCard = ({ title, value, icon, iconBgColor, textColor = 'text-gray-900', arrowIcon, containerClassName, titleClassName, valueClassName }: StatCardProps) => {
  return (
    <div className={`${containerClassName ? containerClassName : 'bg-white rounded-xl p-5 flex flex-col shadow-sm border border-gray-100 relative overflow-hidden'}`}>
      <div className={`${iconBgColor} p-2 rounded-lg inline-block`}>
        {icon}
      </div>
      
      <h3 className={`text-sm mt-3 ${titleClassName ? titleClassName : 'text-gray-500'}`}>{title}</h3>
      <p className={`text-4xl font-semibold mt-1 ${valueClassName ? valueClassName : textColor}`}>{value}</p>

      {arrowIcon && (
        <div className="absolute bottom-4 right-4">
          {arrowIcon}
        </div>
      )}
    </div>
  );
};

export default StatCard;
