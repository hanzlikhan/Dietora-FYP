// src/components/meal/MealCard.jsx
import { Sunrise, Sun, Moon, Apple, Globe, Bot, BarChart2, Shuffle, ChefHat, Check, CheckSquare, Loader2, Droplets, Heart, Activity, Pill, Fingerprint, CheckCircle2 } from 'lucide-react'
import { useDispatch } from 'react-redux'
import { toggleMeal } from '../../store/slices/progressSlice'

const ICONS = { breakfast: Sunrise, lunch: Sun, dinner: Moon, snack: Apple }
const LABELS = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' }

const MEAL_STYLES = {
  breakfast: { accent: 'from-amber-400 to-orange-500',  bg: 'bg-amber-50 dark:bg-amber-900/10',  border: 'border-amber-200 dark:border-amber-800/40',  iconBg: 'bg-amber-100 dark:bg-amber-900/30', iconColor: 'text-amber-600 dark:text-amber-400', labelColor: 'text-amber-700 dark:text-amber-400' },
  lunch:     { accent: 'from-emerald-400 to-teal-500',  bg: 'bg-emerald-50 dark:bg-emerald-900/10', border: 'border-emerald-200 dark:border-emerald-800/40', iconBg: 'bg-emerald-100 dark:bg-emerald-900/30', iconColor: 'text-emerald-600 dark:text-emerald-400', labelColor: 'text-emerald-700 dark:text-emerald-400' },
  dinner:    { accent: 'from-indigo-400 to-blue-600',   bg: 'bg-indigo-50 dark:bg-indigo-900/10',  border: 'border-indigo-200 dark:border-indigo-800/40',  iconBg: 'bg-indigo-100 dark:bg-indigo-900/30',  iconColor: 'text-indigo-600 dark:text-indigo-400',  labelColor: 'text-indigo-700 dark:text-indigo-400' },
  snack:     { accent: 'from-purple-400 to-pink-500',   bg: 'bg-purple-50 dark:bg-purple-900/10',  border: 'border-purple-200 dark:border-purple-800/40',  iconBg: 'bg-purple-100 dark:bg-purple-900/30',  iconColor: 'text-purple-600 dark:text-purple-400',  labelColor: 'text-purple-700 dark:text-purple-400' },
}

const SOURCE_META = {
  grounded: { label: 'Live', icon: Globe,    color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-400' },
  ai:       { label: 'AI',   icon: Bot,      color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/40 dark:text-blue-400' },
  static:   { label: 'Est.', icon: BarChart2, color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/40 dark:text-amber-400' },
}

function PriceBadge({ source }) {
  const m = SOURCE_META[source] || SOURCE_META.static
  const Icon = m.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${m.color}`}>
      <Icon className="w-2.5 h-2.5" />{m.label}
    </span>
  )
}

export default function MealCard({ mealType, meal, dayNum, progressId, dayProgress, toggling, onSwapClick, onRecipeClick }) {
  const dispatch = useDispatch()
  const s = MEAL_STYLES[mealType] || MEAL_STYLES.breakfast
  const Icon = ICONS[mealType] || Sunrise
  const mealDone = dayProgress?.meals?.find(m => m.mealType === mealType)?.completed || false
  const isToggling = toggling === `${dayNum}-${mealType}`

  const handleToggle = () => {
    if (!progressId) return
    dispatch(toggleMeal({ progressId, day: dayNum, mealType, completed: !mealDone }))
  }

  if (!meal) {
    return (
      <div className={`rounded-2xl border-2 border-dashed ${s.border} p-4 opacity-40`}>
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-7 h-7 rounded-lg ${s.iconBg} flex items-center justify-center`}>
            <Icon className={`w-4 h-4 ${s.iconColor}`} />
          </div>
          <span className={`text-xs font-bold uppercase tracking-wider ${s.labelColor}`}>{LABELS[mealType]}</span>
        </div>
        <p className="text-sm text-slate-400 italic">Not assigned</p>
      </div>
    )
  }

  return (
    <div className={`relative rounded-2xl border ${mealDone ? 'border-emerald-300 dark:border-emerald-700' : s.border} ${mealDone ? 'bg-emerald-50/80 dark:bg-emerald-900/20' : s.bg} overflow-hidden transition-all duration-300 ${!mealDone ? 'hover:-translate-y-0.5 hover:shadow-lg' : ''}`}>
      {/* Top accent bar */}
      <div className={`h-1 w-full bg-gradient-to-r ${s.accent}`} />

      <div className="p-4">
        {/* Header row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-lg ${s.iconBg} flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-4 h-4 ${s.iconColor}`} />
            </div>
            <span className={`text-xs font-bold uppercase tracking-wider ${s.labelColor}`}>{LABELS[mealType]}</span>
          </div>
          {mealDone && (
            <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-3 h-3 text-white" />
            </div>
          )}
        </div>

        {/* Food name */}
        <h4
          onClick={() => onRecipeClick(meal)}
          className={`font-bold text-base leading-snug mb-1 cursor-pointer transition-colors ${mealDone ? 'text-emerald-700 dark:text-emerald-400 line-through opacity-70' : 'text-slate-800 dark:text-white hover:text-emerald-600'}`}
        >
          {meal.name}
          <span className="ml-1.5 text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 px-1.5 py-0.5 rounded-full align-middle inline-flex items-center gap-0.5 font-normal">
            <ChefHat className="w-2.5 h-2.5" /> Recipe
          </span>
        </h4>
        {meal.category && <p className="text-[11px] text-slate-400 capitalize mb-3">{meal.category}</p>}

        {/* Price — PROMINENT */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 rounded-xl px-3 py-1.5 border border-slate-200 dark:border-slate-700 shadow-sm">
            <span className="text-lg font-extrabold text-slate-800 dark:text-white">₨{meal.price}</span>
            <PriceBadge source={meal.priceSource} />
          </div>
        </div>

        {/* Nutrition chips */}
        <div className="flex gap-1.5 flex-wrap mb-3">
          <span className="text-[11px] font-semibold bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-2 py-0.5 rounded-full">🔥 {meal.calories} kcal</span>
          <span className="text-[11px] font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full">💪 {meal.protein}g</span>
          <span className="text-[11px] font-semibold bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-0.5 rounded-full">🍞 {meal.carbs}g</span>
        </div>

        {/* Safety badges */}
        {(meal.is_diabetic_safe || meal.is_hypertension_safe || meal.is_cardiac_safe || meal.is_kidney_safe || meal.is_thyroid_safe) && (
          <div className="flex gap-1 flex-wrap mb-3">
            {meal.is_diabetic_safe     && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 flex items-center gap-0.5"><Droplets className="w-2.5 h-2.5"/>DM Safe</span>}
            {meal.is_hypertension_safe && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 flex items-center gap-0.5"><Heart className="w-2.5 h-2.5"/>BP Safe</span>}
            {meal.is_cardiac_safe      && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-600 flex items-center gap-0.5"><Activity className="w-2.5 h-2.5"/>Cardiac</span>}
            {meal.is_kidney_safe       && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 flex items-center gap-0.5"><Pill className="w-2.5 h-2.5"/>Kidney</span>}
            {meal.is_thyroid_safe      && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-teal-50 dark:bg-teal-900/20 text-teal-700 flex items-center gap-0.5"><Fingerprint className="w-2.5 h-2.5"/>Thyroid</span>}
          </div>
        )}

        {/* Action row */}
        <div className="flex gap-2 mt-1">
          {progressId && (
            <button onClick={handleToggle} disabled={isToggling}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                mealDone
                  ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-400 hover:text-emerald-700'
              }`}
            >
              {isToggling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : mealDone ? <><Check className="w-3.5 h-3.5"/>Done</> : <><CheckSquare className="w-3.5 h-3.5"/>Mark Done</>}
            </button>
          )}
          {!mealDone && progressId && (
            <button onClick={() => onSwapClick(mealType)}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-400 hover:text-emerald-700 flex items-center gap-1 transition-all"
            >
              <Shuffle className="w-3.5 h-3.5"/>Swap
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
