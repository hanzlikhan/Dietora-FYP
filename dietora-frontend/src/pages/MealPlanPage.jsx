// src/pages/MealPlanPage.jsx — DIETORA Full 7-Day Calendar
import { useEffect, useState, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { generateMealPlan, fetchMealPlans, fetchActivePlan, fetchAlternatives, swapMeal } from '../store/slices/mealPlanSlice'
import { fetchProfile } from '../store/slices/profileSlice'
import { fetchCurrentProgress, setShowCheckIn, regenerateAfterCheckIn, initProgress } from '../store/slices/progressSlice'
import { Link } from 'react-router-dom'
import WeeklyCheckIn from '../components/onboarding/WeeklyCheckIn'
import RecipeModal from '../components/meal/RecipeModal'
import DaySection from '../components/meal/DaySection'
import api from '../services/api'
import {
  Bot, Globe, BarChart2, CalendarDays, Loader2, Hospital, Activity,
  HeartPulse, CheckCircle2, AlertTriangle, Flame, Coins, ShoppingCart,
  FileText, Utensils, RefreshCw, Zap
} from 'lucide-react'

// ─── Generating Overlay ───────────────────────────────────
function GeneratingOverlay({ message }) {
  const [step, setStep] = useState(0)
  const steps = [
    { text: 'Filtering safe foods for your conditions…', icon: HeartPulse },
    { text: 'AI building your 7-day meal plan…',         icon: Bot },
    { text: 'Validating clinical safety & budget…',      icon: Activity },
    { text: 'Saving your plan…',                         icon: CheckCircle2 },
  ]
  useEffect(() => {
    const t = setInterval(() => setStep(s => (s + 1) % steps.length), 1200)
    return () => clearInterval(t)
  }, [])
  const CurrentIcon = steps[step].icon
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8 w-full max-w-sm text-center border border-slate-200 dark:border-slate-700">
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="w-20 h-20 border-4 border-emerald-100 dark:border-emerald-900 border-t-emerald-500 rounded-full animate-spin"/>
          <div className="absolute inset-0 flex items-center justify-center">
            <Zap className="w-7 h-7 text-emerald-500"/>
          </div>
        </div>
        <h3 className="font-black text-xl text-slate-800 dark:text-white mb-2">{message || 'Generating Your Plan'}</h3>
        <div className="flex items-center justify-center gap-2 text-slate-500 dark:text-slate-400 text-sm mb-5 min-h-[36px]">
          <CurrentIcon className="w-4 h-4 text-emerald-500 flex-shrink-0"/>{steps[step].text}
        </div>
        <div className="flex gap-1 justify-center mb-4">
          {steps.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i <= step ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`}
              style={{ width: i <= step ? '20px' : '6px' }}/>
          ))}
        </div>
        <p className="text-xs text-slate-400 flex items-center justify-center gap-1.5">
          <Zap className="w-3 h-3 text-emerald-500"/> Prices update live in background after plan loads
        </p>
      </div>
    </div>
  )
}

// ─── Price Refresh Banner ─────────────────────────────────
function PriceRefreshBanner({ planId, onPricesReady }) {
  const [status, setStatus] = useState('updating')
  const [source, setSource] = useState('static')

  useEffect(() => {
    if (!planId) return
    let tries = 0
    const poll = async () => {
      try {
        const { data } = await api.get(`/meal-plans/${planId}/prices`)
        const s = data?.data?.priceStatus || 'ready'
        setStatus(s)
        if (s === 'ready') {
          setSource(data?.data?.priceDataSource || 'static')
          onPricesReady(data?.data)
          return
        }
      } catch {}
      tries++
      if (tries < 12) setTimeout(poll, 3000)
      else setStatus('ready')
    }
    const t = setTimeout(poll, 3000)
    return () => clearTimeout(t)
  }, [planId])

  if (status === 'ready') {
    const label = source === 'grounded' ? 'Live Google prices applied ✓' : source === 'ai' ? 'AI-estimated prices applied ✓' : 'Market research prices applied ✓'
    const color = source === 'grounded' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400'
      : 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400'
    return (
      <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold ${color}`}>
        <Globe className="w-4 h-4"/>{label}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-sm font-semibold">
      <RefreshCw className="w-4 h-4 animate-spin"/>Fetching live prices from Google…
    </div>
  )
}

// ─── Week Summary Bar ─────────────────────────────────────
function WeekSummaryBar({ plan, progress }) {
  const weekCost = plan?.weeklyTotalCost || 0
  const avgDay   = plan?.avgDailyCost    || 0
  const weekCal  = plan?.weeklyTotalCalories || plan?.totalCalories || 0
  const adherence= progress?.adherencePercent || 0
  const completed= progress?.completedMeals  || 0
  const total    = progress?.totalMeals      || 28

  return (
    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-3xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <CalendarDays className="w-5 h-5 text-emerald-600"/>
        <h2 className="font-black text-slate-800 dark:text-white text-base">
          Week Overview
          {progress && <span className="ml-2 text-xs font-semibold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 rounded-full">Week {progress.weekNumber}</span>}
        </h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
        {[
          { label:'Weekly Cost',  value:`₨${Math.round(weekCost)}`, color:'text-amber-600', sub:'total spend' },
          { label:'Per Day',      value:`₨${Math.round(avgDay)}`,   color:'text-emerald-600', sub:'avg/day' },
          { label:'Weekly Cals',  value:`${Math.round(weekCal/1000)}k`, color:'text-orange-500', sub:'kcal total' },
          { label:'Adherence',    value:`${adherence}%`,            color:'text-blue-600', sub:`${completed}/${total} meals` },
        ].map(item => (
          <div key={item.label} className="text-center bg-slate-50 dark:bg-slate-700/50 rounded-2xl py-3 px-2">
            <p className={`text-xl font-black ${item.color}`}>{item.value}</p>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">{item.label}</p>
            <p className="text-[10px] text-slate-400">{item.sub}</p>
          </div>
        ))}
      </div>
      {progress && (
        <div>
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>Weekly adherence</span><span className="font-bold">{adherence}%</span>
          </div>
          <div className="h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-700 ${adherence >= 80 ? 'bg-emerald-500' : adherence >= 50 ? 'bg-amber-500' : 'bg-red-400'}`}
              style={{ width: `${adherence}%` }}/>
          </div>
          <div className="grid grid-cols-7 gap-1 mt-2">
            {progress.days?.map(d => {
              const done  = d.meals?.filter(m => m.completed).length || 0
              const tot   = d.meals?.length || 4
              const dp    = tot > 0 ? (done/tot)*100 : 0
              return (
                <div key={d.day} className="text-center">
                  <div className={`h-1.5 rounded-full mb-1 ${dp===100?'bg-emerald-500':dp>=50?'bg-amber-400':dp>0?'bg-orange-300':'bg-slate-200 dark:bg-slate-700'}`}/>
                  <span className="text-[9px] text-slate-400">D{d.day}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Swap Modal ───────────────────────────────────────────
function SwapModal({ isOpen, onClose, day, mealType, planId }) {
  const dispatch = useDispatch()
  const [alts, setAlts] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    dispatch(fetchAlternatives({ planId, day, meal: mealType }))
      .unwrap().then(r => { setAlts(r); setLoading(false) }).catch(() => setLoading(false))
  }, [isOpen, planId, day, mealType])
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-6 w-full max-w-md border border-slate-200 dark:border-slate-700">
        <h3 className="font-black text-xl text-slate-800 dark:text-white mb-4 capitalize">Swap {mealType}</h3>
        {loading ? (
          <div className="py-10 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-500"/></div>
        ) : (
          <div className="space-y-3">
            {alts.map(alt => (
              <div key={alt._id} className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-emerald-400 transition-colors bg-slate-50/50 dark:bg-slate-800/50">
                <div>
                  <p className="font-bold text-sm text-slate-800 dark:text-white">{alt.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">🔥 {alt.calories} kcal · ₨{alt.price}</p>
                </div>
                <button onClick={() => { dispatch(swapMeal({ planId, day, meal: mealType, foodItemId: alt._id })).then(() => onClose()) }}
                  className="px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-xl hover:bg-emerald-200 transition-colors">
                  Select
                </button>
              </div>
            ))}
            {alts.length === 0 && <p className="text-sm text-slate-500 text-center py-4">No alternatives found.</p>}
          </div>
        )}
        <button onClick={onClose} className="mt-4 w-full py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
//  MAIN PAGE
// ════════════════════════════════════════════════════════════
export default function MealPlanPage() {
  const dispatch = useDispatch()
  const { current, list, generating, error } = useSelector(s => s.mealPlan)
  const { data: profile }                     = useSelector(s => s.profile)
  const { current: progress, showCheckIn, regenerating, toggling } = useSelector(s => s.progress)

  const [showGenerator, setShowGenerator]   = useState(false)
  const [budgetOverride, setBudgetOverride] = useState('')
  const [swapData, setSwapData]             = useState(null)
  const [recipeData, setRecipeData]         = useState(null)
  const [priceReady, setPriceReady]         = useState(false)
  const [showPriceBanner, setShowPriceBanner] = useState(false)

  useEffect(() => {
    dispatch(fetchProfile())
    dispatch(fetchMealPlans())
    dispatch(fetchActivePlan())
    dispatch(fetchCurrentProgress())
  }, [dispatch])

  useEffect(() => {
    if (current?._id) dispatch(fetchCurrentProgress())
  }, [current?._id, dispatch])

  const activePlan     = current || list?.[0]
  const activeProgress = (progress?.mealPlan === activePlan?._id || progress?.mealPlan?._id === activePlan?._id) ? progress : null

  const handleGenerate = () => {
    const params = {}
    if (budgetOverride && parseInt(budgetOverride) >= 100) params.budgetLimit = parseInt(budgetOverride)
    dispatch(generateMealPlan(params)).then(result => {
      if (result.payload) {
        setShowPriceBanner(true)
        setPriceReady(false)
        setTimeout(() => dispatch(fetchCurrentProgress()), 1000)
      }
    })
    setShowGenerator(false)
    setBudgetOverride('')
  }

  const handlePricesReady = useCallback(async (priceData) => {
    setPriceReady(true)
    if (activePlan?._id) {
      dispatch(fetchActivePlan())
    }
  }, [activePlan?._id, dispatch])

  const handleCheckInComplete = progressId => {
    dispatch(regenerateAfterCheckIn(progressId)).then(() => {
      dispatch(fetchActivePlan()); dispatch(fetchCurrentProgress())
    })
    dispatch(setShowCheckIn(false))
  }

  if (!profile) {
    return (
      <div className="max-w-lg mx-auto text-center py-24 card border-dashed border-2">
        <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center mx-auto mb-6">
          <Hospital className="w-10 h-10 text-emerald-600"/>
        </div>
        <h2 className="font-black text-2xl text-slate-800 dark:text-white mb-3">Setup Health Profile First</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">We need your health info to generate a safe, personalised meal plan.</p>
        <Link to="/profile" className="btn-primary py-3 px-8 inline-flex">Setup Profile →</Link>
      </div>
    )
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {(generating || regenerating) && <GeneratingOverlay message={regenerating ? `Generating Week ${(activeProgress?.weekNumber||1)+1} Plan` : null}/>}
      {showCheckIn && activeProgress && <WeeklyCheckIn progress={activeProgress} onRegenerate={handleCheckInComplete}/>}

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-title">AI Meal Planner</h1>
          <p className="page-subtitle">Personalised 7-day plans · Real-time PKR prices via Google · Daily tracking</p>
        </div>
        <button onClick={() => setShowGenerator(true)} disabled={generating}
          className="btn-primary flex items-center gap-2 flex-shrink-0">
          <Bot className="w-5 h-5"/>Generate New Plan
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl flex items-center gap-3">
          <AlertTriangle className="text-red-500 w-5 h-5 flex-shrink-0"/>
          <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Generator Modal */}
      {showGenerator && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-6 w-full max-w-md border border-slate-200 dark:border-slate-700">
            <h3 className="font-black text-xl text-slate-800 dark:text-white mb-1">Generate 7-Day Plan</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-5">Health profile applied · Live PKR prices via Google Search</p>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 mb-5 space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <p className="flex items-center gap-1.5"><Hospital className="w-3.5 h-3.5 text-slate-400"/>Conditions: {[profile.isDiabetic&&'Diabetes',profile.isHypertensive&&'Hypertension',profile.isCardiac&&'Cardiac',profile.hasKidneyDisease&&'Kidney',profile.hasThyroid&&'Thyroid'].filter(Boolean).join(', ')||'None'}</p>
              <p className="flex items-center gap-1.5"><Flame className="w-3.5 h-3.5 text-orange-500"/>Target: ~{Math.round(profile.dailyCalorieTarget||profile.tdee||2000)} kcal/day</p>
              <p className="flex items-center gap-1.5"><Coins className="w-3.5 h-3.5 text-amber-500"/>Budget: ₨{profile.dailyBudget}/day</p>
              <p className="flex items-center gap-1.5 text-emerald-600 font-semibold"><Zap className="w-3.5 h-3.5"/>Fast generation · Prices update live in background</p>
            </div>
            <div className="mb-5">
              <label className="label">Budget Override (optional)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">₨</span>
                <input type="number" placeholder={`Default: ₨${profile.dailyBudget}`} value={budgetOverride}
                  onChange={e => setBudgetOverride(e.target.value)} className="input-field pl-8" min="100"/>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowGenerator(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleGenerate} className="btn-primary flex-1"><Bot className="w-5 h-5"/>Generate Now</button>
            </div>
          </div>
        </div>
      )}

      {/* Plan View */}
      {activePlan ? (
        <>
          {/* Price refresh banner */}
          {showPriceBanner && (
            <PriceRefreshBanner planId={activePlan._id} onPricesReady={handlePricesReady}/>
          )}

          {/* Week summary */}
          <WeekSummaryBar plan={activePlan} progress={activeProgress}/>

          {/* Plan info bar */}
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-3xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/40 rounded-2xl flex items-center justify-center">
                <CalendarDays className="w-5 h-5 text-emerald-600"/>
              </div>
              <div>
                <p className="font-bold text-slate-800 dark:text-white text-sm">7-Day Meal Plan
                  {activeProgress && <span className="ml-2 text-xs text-emerald-600 font-normal">Week {activeProgress.weekNumber}</span>}
                </p>
                <p className="text-xs text-slate-400">{new Date(activePlan.createdAt).toLocaleDateString('en-PK',{day:'numeric',month:'short',year:'numeric'})}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {activePlan.priceDataSource && (
                <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl ${
                  activePlan.priceDataSource==='grounded'?'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                  :activePlan.priceDataSource==='ai'?'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
                  :'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                }`}>
                  {activePlan.priceDataSource==='grounded'?<Globe className="w-3.5 h-3.5"/>:activePlan.priceDataSource==='ai'?<Bot className="w-3.5 h-3.5"/>:<BarChart2 className="w-3.5 h-3.5"/>}
                  {activePlan.priceDataSource==='grounded'?'Live Google Prices':activePlan.priceDataSource==='ai'?'AI Market Prices':'Estimated Prices'}
                </span>
              )}
              <Link to="/grocery" className="btn-amber py-2 px-3 text-xs flex items-center gap-1.5">
                <ShoppingCart className="w-3.5 h-3.5"/>Grocery
              </Link>
            </div>
          </div>

          {/* 7-Day Calendar */}
          <div className="space-y-4">
            {(activePlan.days || []).map((dayObj, i) => (
              <DaySection
                key={i}
                dayObj={dayObj}
                dayIndex={i}
                activeProgress={activeProgress}
                activePlan={activePlan}
                toggling={toggling}
                onSwapClick={mealType => setSwapData({ day: i+1, mealType, planId: activePlan._id })}
                onRecipeClick={meal => setRecipeData({ foodId: meal.foodId, foodName: meal.name })}
              />
            ))}
          </div>

          <SwapModal isOpen={!!swapData} onClose={() => setSwapData(null)} day={swapData?.day} mealType={swapData?.mealType} planId={swapData?.planId}/>
          <RecipeModal isOpen={!!recipeData} onClose={() => setRecipeData(null)} foodId={recipeData?.foodId} foodName={recipeData?.foodName}/>

          {!activeProgress && activePlan?._id && (
            <div className="card text-center py-12 border-dashed border-2">
              <Activity className="w-10 h-10 text-blue-500 mx-auto mb-3"/>
              <p className="font-bold text-slate-800 dark:text-white mb-1">Enable Meal Tracking</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-5 max-w-sm mx-auto">Track daily meals and get a personalised next-week update.</p>
              <button onClick={() => dispatch(initProgress(activePlan._id)).then(() => dispatch(fetchCurrentProgress()))}
                className="btn-primary py-2.5 px-8 inline-flex"><Activity className="w-4 h-4"/>Start Tracking</button>
            </div>
          )}

          {list.length > 1 && (
            <div className="card">
              <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2 text-base">
                <FileText className="w-5 h-5 text-slate-400"/>Past Plans
              </h3>
              <div className="space-y-2">
                {list.slice(1, 6).map((plan, i) => (
                  <div key={plan._id||i} className="flex items-center justify-between py-2.5 border-b border-slate-100 dark:border-slate-700 last:border-0">
                    <div>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">7-Day Plan #{list.length-i-1}</p>
                      <p className="text-xs text-slate-400">{new Date(plan.createdAt).toLocaleDateString()}</p>
                    </div>
                    <span className="text-amber-600 font-bold text-sm">₨{plan.weeklyTotalCost||plan.totalCost||'—'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="card text-center py-24 border-dashed border-2">
          <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center mx-auto mb-6">
            <Utensils className="w-12 h-12 text-emerald-600"/>
          </div>
          <h3 className="font-black text-3xl text-slate-800 dark:text-white mb-3">No meal plans yet</h3>
          <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md mx-auto leading-relaxed">
            Generate your first AI-powered 7-day plan with real-time PKR prices and clinical safety checks.
          </p>
          <button onClick={() => setShowGenerator(true)} className="btn-primary py-3 px-8 text-base inline-flex">
            <Bot className="w-5 h-5"/>Generate My First Plan
          </button>
        </div>
      )}
    </div>
  )
}
