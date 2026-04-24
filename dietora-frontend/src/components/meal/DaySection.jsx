// src/components/meal/DaySection.jsx
import { CalendarDays, Flame, Coins, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import MealCard from './MealCard'

const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'snack']

export default function DaySection({ dayObj, dayIndex, activeProgress, activePlan, toggling, onSwapClick, onRecipeClick }) {
  const today = new Date(); today.setHours(0,0,0,0)
  const dayDate = dayObj.date ? new Date(dayObj.date) : null
  const isToday = dayDate && dayDate.toDateString() === today.toDateString()
  // Today's section starts expanded; others collapsed by default for performance
  const [collapsed, setCollapsed] = useState(!isToday)
  const dayProgress = activeProgress?.days?.find(d => d.day === dayIndex + 1)
  const progressId  = activeProgress?._id

  const completedMeals = dayProgress?.meals?.filter(m => m.completed).length || 0
  const totalMeals     = dayProgress?.meals?.length || 4
  const allDone        = completedMeals === totalMeals && totalMeals > 0
  const pct            = Math.round((completedMeals / totalMeals) * 100)

  // Use server-computed totals (more reliable than re-summing client-side)
  const dayCost = dayObj.totalCost || 0
  const dayCal  = dayObj.totalCalories || 0

  const todayCheck = new Date(); todayCheck.setHours(0,0,0,0)
  const dayDateCheck = dayObj.date ? new Date(dayObj.date) : null
  const isTodayCheck = dayDateCheck && dayDateCheck.toDateString() === todayCheck.toDateString()

  return (
    <div className={`rounded-3xl border overflow-hidden transition-all duration-300 ${
      allDone
        ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/30 dark:bg-emerald-900/10'
        : isTodayCheck
        ? 'border-blue-300 dark:border-blue-600 bg-blue-50/30 dark:bg-blue-900/10'
        : 'border-slate-200 dark:border-slate-700/60 bg-white/80 dark:bg-slate-800/60'
    } backdrop-blur-xl shadow-sm hover:shadow-md`}>

      {/* Day header */}
      <div
        className={`flex items-center justify-between px-5 py-4 cursor-pointer select-none ${
          allDone ? 'bg-emerald-100/60 dark:bg-emerald-900/20' : isTodayCheck ? 'bg-blue-100/60 dark:bg-blue-900/20' : 'bg-slate-50/80 dark:bg-slate-800/40'
        }`}
        onClick={() => setCollapsed(c => !c)}
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shadow-sm ${
            allDone ? 'bg-emerald-500 text-white' : isTodayCheck ? 'bg-blue-500 text-white' : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200'
          }`}>
            {dayIndex + 1}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-slate-800 dark:text-white text-base">{dayObj.dayName}</h3>
              {isToday && <span className="text-[10px] font-bold bg-blue-500 text-white px-2 py-0.5 rounded-full">TODAY</span>}
              {allDone && <span className="text-[10px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded-full">✓ COMPLETE</span>}
            </div>
            {dayDateCheck && (
              <p className="text-xs text-slate-400 mt-0.5">
                {dayDateCheck.toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'short' })}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Stats */}
          <div className="hidden sm:flex items-center gap-4">
            <div className="text-center">
              <p className="font-bold text-amber-600 dark:text-amber-400 text-sm flex items-center gap-1"><Coins className="w-3.5 h-3.5"/>₨{Math.round(dayCost)}</p>
              <p className="text-[10px] text-slate-400">Day Cost</p>
            </div>
            <div className="text-center">
              <p className="font-bold text-orange-500 text-sm flex items-center gap-1"><Flame className="w-3.5 h-3.5"/>{dayCal}</p>
              <p className="text-[10px] text-slate-400">kcal</p>
            </div>
          </div>

          {/* Progress ring */}
          {activeProgress && (
            <div className="flex flex-col items-center gap-0.5">
              <div className="relative w-10 h-10">
                <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="3" className="text-slate-200 dark:text-slate-700"/>
                  <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="3"
                    className={allDone ? 'text-emerald-500' : 'text-blue-500'}
                    strokeDasharray={`${pct * 0.879} 87.9`} strokeLinecap="round"/>
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-slate-600 dark:text-slate-300">{pct}%</span>
              </div>
            </div>
          )}

          {collapsed ? <ChevronDown className="w-4 h-4 text-slate-400"/> : <ChevronUp className="w-4 h-4 text-slate-400"/>}
        </div>
      </div>

      {/* Meals grid */}
      {!collapsed && (
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {MEAL_ORDER.filter(mt => mt !== 'snack' || dayObj.meals?.snack).map(mealType => (
            <MealCard
              key={mealType}
              mealType={mealType}
              meal={dayObj.meals?.[mealType]}
              dayNum={dayIndex + 1}
              progressId={progressId}
              dayProgress={dayProgress}
              toggling={toggling}
              onSwapClick={onSwapClick}
              onRecipeClick={onRecipeClick}
            />
          ))}
        </div>
      )}
    </div>
  )
}
