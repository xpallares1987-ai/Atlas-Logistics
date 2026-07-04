'use client';

import { CheckCircle2, Circle, Clock } from 'lucide-react';

export interface StepperMilestone {
  id: string;
  title: string;
  location: string;
  date: string | null;
  status: 'completed' | 'current' | 'pending' | 'delayed';
  description?: string;
  icon?: React.ReactNode;
}

interface MilestoneStepperProps {
  milestones: StepperMilestone[];
  currentStepIndex: number;
  orientation?: 'horizontal' | 'vertical';
}

export function MilestoneStepper({ milestones, currentStepIndex, orientation = 'horizontal' }: MilestoneStepperProps) {
  const isVertical = orientation === 'vertical';

  return (
    <div className={`w-full ${isVertical ? 'flex flex-col' : 'flex flex-row overflow-x-auto pb-4'}`}>
      {milestones.map((milestone, index) => {
        const isLast = index === milestones.length - 1;
        const isCompleted = milestone.status === 'completed' || index < currentStepIndex;
        const isCurrent = milestone.status === 'current' || index === currentStepIndex;
        const isDelayed = milestone.status === 'delayed';

        let StatusIcon = Circle;
        let iconColor = 'text-slate-500';
        let bgColor = 'bg-slate-800';
        let borderColor = 'border-slate-700';
        let lineColor = 'bg-slate-700';

        if (isCompleted) {
          StatusIcon = CheckCircle2;
          iconColor = 'text-emerald-400';
          bgColor = 'bg-emerald-900/30';
          borderColor = 'border-emerald-500';
          lineColor = 'bg-emerald-500';
        } else if (isCurrent) {
          StatusIcon = Clock;
          iconColor = 'text-blue-400';
          bgColor = 'bg-blue-900/30';
          borderColor = 'border-blue-500';
        } else if (isDelayed) {
          StatusIcon = Clock;
          iconColor = 'text-red-400';
          bgColor = 'bg-red-900/30';
          borderColor = 'border-red-500';
          lineColor = 'bg-red-500/50';
        }

        return (
          <div key={milestone.id} className={`flex ${isVertical ? 'flex-row' : 'flex-col items-center flex-1 min-w-[150px]'}`}>
            {/* Icon and Line */}
            <div className={`relative flex items-center justify-center ${isVertical ? 'flex-col mr-4' : 'w-full mb-3'}`}>
              <div className={`z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 ${bgColor} ${borderColor} ${iconColor} transition-all duration-300 shadow-lg`}>
                {milestone.icon || <StatusIcon size={20} />}
              </div>
              
              {!isLast && (
                <div 
                  className={`absolute ${isVertical ? 'w-0.5 h-full top-10' : 'h-0.5 w-full left-[50%] top-[50%] -translate-y-[50%]'} ${lineColor} transition-all duration-500`}
                />
              )}
            </div>

            {/* Content */}
            <div className={`${isVertical ? 'pb-8 pt-1' : 'text-center px-2'}`}>
              <h4 className={`text-sm font-bold ${isCompleted ? 'text-slate-200' : isCurrent ? 'text-blue-400' : isDelayed ? 'text-red-400' : 'text-slate-400'}`}>
                {milestone.title}
              </h4>
              <p className="text-xs text-slate-400 font-medium mt-1">{milestone.location}</p>
              {milestone.date && (
                <p className="text-xs text-slate-500 mt-1 font-mono bg-slate-800/50 inline-block px-1.5 py-0.5 rounded">
                  {milestone.date}
                </p>
              )}
              {milestone.description && (
                <p className={`text-xs mt-2 ${isVertical ? 'max-w-md' : 'mx-auto'} text-slate-500`}>
                  {milestone.description}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}


