"use client";

import { CheckCircle2, Circle, Clock, CloudRain, Sun } from "lucide-react";
import { usePortWeather } from "./hooks/usePortWeather";

export interface StepperMilestone {
  id: string;
  title: string;
  location: string;
  date: string | null;
  status: "completed" | "current" | "pending" | "delayed";
  description?: string;
  icon?: React.ReactNode;
  lat?: number;
  lon?: number;
}

function MilestoneWeather({ lat, lon }: { lat: number; lon: number }) {
  const { weather, loading } = usePortWeather(lat, lon);

  if (loading || !weather)
    return (
      <span className="animate-pulse w-4 h-4 bg-slate-700 rounded-full inline-block" />
    );

  return (
    <div className="flex items-center gap-1.5 mt-2 bg-slate-900/60 backdrop-blur-md w-fit px-2 py-1 rounded-lg border border-white/10 shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
      {weather.icon === "CloudRain" ||
      weather.icon === "CloudSnow" ||
      weather.icon === "CloudLightning" ? (
        <CloudRain className="w-3 h-3 text-blue-400" />
      ) : (
        <Sun className="w-3 h-3 text-yellow-400" />
      )}
      <span className="text-[10px] text-slate-300 font-medium">
        {weather.temp}°C, {weather.description}
      </span>
    </div>
  );
}

interface MilestoneStepperProps {
  milestones: StepperMilestone[];
  currentStepIndex: number;
  orientation?: "horizontal" | "vertical";
}

export function MilestoneStepper({
  milestones,
  currentStepIndex,
  orientation = "horizontal",
}: MilestoneStepperProps) {
  const isVertical = orientation === "vertical";

  return (
    <div
      className={`w-full ${isVertical ? "flex flex-col" : "flex flex-row overflow-x-auto pb-4"}`}
    >
      {milestones.map((milestone, index) => {
        const isLast = index === milestones.length - 1;
        const isCompleted =
          milestone.status === "completed" || index < currentStepIndex;
        const isCurrent =
          milestone.status === "current" || index === currentStepIndex;
        const isDelayed = milestone.status === "delayed";

        let StatusIcon = Circle;
        let iconColor = "text-slate-500";
        let bgColor = "bg-slate-800/40 backdrop-blur-md";
        let borderColor = "border-white/10";
        let lineColor = "bg-white/10";
        let shadowClass = "";

        if (isCompleted) {
          StatusIcon = CheckCircle2;
          iconColor = "text-emerald-400";
          bgColor = "bg-emerald-500/10 backdrop-blur-md";
          borderColor = "border-emerald-500/50";
          lineColor = "bg-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.5)]";
          shadowClass = "shadow-[0_0_15px_rgba(16,185,129,0.2)]";
        } else if (isCurrent) {
          StatusIcon = Clock;
          iconColor = "text-blue-400";
          bgColor = "bg-blue-500/10 backdrop-blur-md";
          borderColor = "border-blue-500/50";
          shadowClass = "shadow-[0_0_15px_rgba(59,130,246,0.3)]";
        } else if (isDelayed) {
          StatusIcon = Clock;
          iconColor = "text-red-400";
          bgColor = "bg-red-500/10 backdrop-blur-md";
          borderColor = "border-red-500/50";
          lineColor = "bg-red-500/50 shadow-[0_0_8px_rgba(239,68,68,0.5)]";
          shadowClass = "shadow-[0_0_15px_rgba(239,68,68,0.2)]";
        }

        return (
          <div
            key={milestone.id}
            className={`flex ${isVertical ? "flex-row" : "flex-col items-center flex-1 min-w-[150px]"}`}
          >
            {/* Icon and Line */}
            <div
              className={`relative flex items-center justify-center ${isVertical ? "flex-col mr-4" : "w-full mb-3"}`}
            >
              <div
                className={`z-10 flex items-center justify-center w-10 h-10 rounded-full border ${bgColor} ${borderColor} ${iconColor} transition-all duration-300 ${shadowClass}`}
              >
                {milestone.icon || <StatusIcon size={20} />}
              </div>

              {!isLast && (
                <div
                  className={`absolute ${isVertical ? "w-0.5 h-full top-10" : "h-0.5 w-full left-[50%] top-[50%] -translate-y-[50%]"} ${lineColor} transition-all duration-500`}
                />
              )}
            </div>

            {/* Content */}
            <div className={`${isVertical ? "pb-8 pt-1" : "text-center px-2"}`}>
              <h4
                className={`text-sm font-bold ${isCompleted ? "text-slate-200" : isCurrent ? "text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" : isDelayed ? "text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" : "text-slate-400"}`}
              >
                {milestone.title}
              </h4>
              <p className="text-xs text-slate-400 font-medium mt-1">
                {milestone.location}
              </p>
              {milestone.date && (
                <p className="text-xs text-slate-400 mt-1.5 font-mono bg-slate-900/50 border border-white/5 backdrop-blur-sm px-2 py-1 rounded-md shadow-inner inline-block">
                  {milestone.date}
                </p>
              )}
              {milestone.description && (
                <p
                  className={`text-xs mt-2 ${isVertical ? "max-w-md" : "mx-auto"} text-slate-500`}
                >
                  {milestone.description}
                </p>
              )}
              {milestone.lat && milestone.lon && (
                <div className={isVertical ? "" : "flex justify-center"}>
                  <MilestoneWeather lat={milestone.lat} lon={milestone.lon} />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
