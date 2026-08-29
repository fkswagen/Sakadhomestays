import { useEffect, useState } from 'react'
import { Link, Route, Routes, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CalendarDays, Check, Globe2, LogOut, MapPin, Menu, Mountain, ShieldCheck, Star, UserRound, X } from 'lucide-react'
import { supabase } from './supabase'

const rooms = [
  { id: 'cloud-view-cottage', name: { en: 'Cloud View Cottage', th: 'คอทเทจวิวเมฆ' }, tag: { en: 'For two', th: 'สำหรับ 2 ท่าน' }, price: 2400, guests: 2, image: 'https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=1100&q=85', details: ['1 king bed', 'Private balcony', 'Mountain breakfast'] },
  { id: 'forest-family-house', name: { en: 'Forest Family House', th: 'บ้านครอบครัวกลางป่า' }, tag: { en: 'For four', th: 'สำหรับ 4 ท่าน' }, price: 4200, guests: 4, image: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=1100&q=85', details: ['2 bedrooms', 'Living room', 'Valley-facing deck'] },
  { id: 'hmong-hill-cabin', name: { en: 'Hmong Hill Cabin', th: 'กระท่อมม้งบนดอย' }, tag: { en: 'For two', th: 'สำหรับ 2 ท่าน' }, price: 1850, guests: 2, image: 'https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?auto=format&fit=crop&w=1100&q=85', details: ['1 queen bed', 'Garden view', 'Handcrafted interiors'] },
]

const copy = {
  en: { stay: 'Stay', experiences: 'Experiences', findUs: 'Find us', signIn: 'Sign in', reserve: 'Reserve', checkIn: 'Check in', checkOut: 'Check out', guests: 'Guests', search: 'Check availability', hero: 'Wake up above clouds.', intro: 'Rooted in quiet. Made for wonder.', book: 'Book this stay', from: 'From', night: 'night', noAvailability: 'No available stays for these dates.', account: 'My account', logout: 'Sign out', checkout: 'Checkout', pay: 'Continue to secure payment', fullPayment: 'Full payment is charged securely by Stripe.', loading: 'Loading...', back: 'Back to stays' },
  th: { stay: 'ที่พัก', experiences: 'ประสบการณ์', findUs: 'การเดินทาง', signIn: 'เข้าสู่ระบบ', reserve: 'จองที่พัก', checkIn: 'เช็กอิน', checkOut: 'เช็กเอาต์', guests: 'ผู้เข้าพัก', search: 'ตรวจสอบห้องว่าง', hero: 'ตื่นเหนือทะเลหมอก', intro: 'พักอย่างสงบ แล้วออกไปค้นพบ', book: 'จองที่พักนี้', from: 'เริ่มต้น', night: 'คืน', noAvailability: 'ไม่มีห้องว่างสำหรับวันที่เลือก', account: 'บัญชีของฉัน', logout: 'ออกจากระบบ', checkout: 'ชำระเงิน', pay: 'ไปยังหน้าชำระเงินที่ปลอดภัย', fullPayment: 'ชำระเต็มจำนวนอย่างปลอดภัยผ่าน Stripe', loading: 'กำลังโหลด...', back: 'กลับไปดูที่พัก' },
}

function useSession() {
  const [session, setSession] = useState(null)
  useEffect(() => {
    if (!supabase) return undefined
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => listener.subscription.unsubscribe()
  }, [])
  return session
}

function App() {
  const [language, setLanguage] = useState('en')
  const session = useSession()
  const t = copy[language]
  return <Routes>
    <Route path="/" element={<Home t={t} language={language} setLanguage={setLanguage} session={session} />} />
    <Route path="/stays" element={<Stays t={t} language={language} setLanguage={setLanguage} session={session} />} />
    <Route path="/checkout" element={<Checkout t={t} language={language} setLanguage={setLanguage} session={session} />} />
    <Route path="/confirmation" element={<Confirmation t={t} />} />
    <Route path="/account" element={<Account t={t} language={language} setLanguage={setLanguage} session={session} />} />
    <Route path="/auth" element={<Auth t={t} />} />
  </Routes>
}

function Header({ t, language, setLanguage, session }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const signOut = async () => { await supabase?.auth.signOut(); navigate('/') }
  return <header className="site-header"><Link className="brand" to="/"><Mountain size={26} /><span>SAKAD<em>HOMESTAYS</em></span></Link><nav className={open ? 'nav open' : 'nav'}><Link to="/stays">{t.stay}</Link><a href="/#experience">{t.experiences}</a><a href="/#find-us">{t.findUs}</a></nav><div className="header-actions"><button className="text-button language-button" onClick={() => setLanguage?.(language === 'en' ? 'th' : 'en')}><Globe2 size={16} />{language === 'en' ? 'ไทย' : 'EN'}</button>{session ? <><Link className="text-button" to="/account"><UserRound size={17} />{t.account}</Link><button className="text-button" onClick={signOut}><LogOut size={16} />{t.logout}</button></> : <Link className="text-button" to="/auth"><UserRound size={17} />{t.signIn}</Link>}<Link className="reserve-button" to="/stays">{t.reserve}<ArrowRight size={16} /></Link><button className="menu-button" onClick={() => setOpen(!open)} aria-label="Toggle navigation">{open ? <X /> : <Menu />}</button></div></header>
}

function SearchBar({ t, compact = false }) {
  const navigate = useNavigate()
  const today = new Date().toISOString().slice(0, 10)
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [guests, setGuests] = useState(2)
  const submit = (event) => { event.preventDefault(); if (checkIn && checkOut && checkOut > checkIn) navigate(`/stays?checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`) }
  return <form className={`booking-bar ${compact ? 'compact' : ''}`} onSubmit={submit}><label><span>{t.checkIn}</span><div><CalendarDays size={18} /><input type="date" min={today} value={checkIn} onChange={(event) => setCheckIn(event.target.value)} required /></div></label><label><span>{t.checkOut}</span><div><CalendarDays size={18} /><input type="date" min={checkIn || today} value={checkOut} onChange={(event) => setCheckOut(event.target.value)} required /></div></label><label><span>{t.guests}</span><select value={guests} onChange={(event) => setGuests(event.target.value)}>{[1, 2, 3, 4].map(value => <option value={value} key={value}>{value}</option>)}</select></label><button className="check-button" type="submit">{t.search}<ArrowRight size={18} /></button></form>
}

function Home({ t, language, setLanguage, session }) {
  return <><Header t={t} language={language} setLanguage={setLanguage} session={session} /><main><section className="hero"><div className="hero-copy"><p className="eyebrow light">NAN, NORTHERN THAILAND</p><h1>{t.hero}</h1><p className="hero-description">Slow mornings, mountain air, and stories shared across table. Your home in Sakad village.</p><Link className="underlined-link" to="/stays">Discover our homes <ArrowRight size={17} /></Link></div><div className="hero-note"><span>18.8577° N</span><span>101.0323° E</span></div></section><section className="booking-shell"><SearchBar t={t} /></section><section className="intro section-pad"><div><p className="eyebrow">A PLACE TO PAUSE</p><h2>{t.intro}</h2></div><p>High in Doi Phu Kha National Park, Sakad Homestays offers local hospitality and wide-open mountain views.</p></section><section className="room-grid">{rooms.map(room => <RoomCard room={room} language={language} key={room.id} />)}</section><section className="experience section-pad" id="experience"><div className="experience-image"><img src="https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=1200&q=85" alt="Northern Thailand mountains" /></div><div className="experience-copy"><p className="eyebrow">MORE THAN A STAY</p><h2>Days with <i>meaning.</i></h2><p>Follow misty trails at sunrise. Learn Nan-style food in family kitchens. Drink tea by firelight while village stories unfold.</p><div className="feature-list"><span><Check size={17} /> Local breakfast included</span><span><Check size={17} /> Community-led experiences</span><span><Check size={17} /> Doi Phu Kha National Park</span></div></div></section><section className="location" id="find-us"><div className="map-card"><MapPin className="map-pin" size={42} fill="#c75b35" /><div className="map-label">SAKAD<br />HOMESTAYS</div></div><div className="location-copy"><p className="eyebrow">COME FIND US</p><h2>Far from ordinary.</h2><p>Sakad village sits in Nan province, about 2.5 hours from Nan Nakhon Airport.</p><a className="underlined-link dark" href="https://maps.google.com/?q=Sakad+Homestay+Nan+Thailand" target="_blank" rel="noreferrer">Open in Google Maps <ArrowRight size={17} /></a></div></section></main><Footer /></>
}

function RoomCard({ room, language, query = '' }) {
  return <article className="room-card"><img src={room.image} alt={room.name[language]} /><div className="room-overlay"><div><p>{room.tag[language]}</p><h3>{room.name[language]}</h3><strong>THB {room.price.toLocaleString()} / night</strong></div><Link aria-label={`Book ${room.name[language]}`} to={`/checkout?room=${room.id}${query}`}><ArrowRight size={19} /></Link></div></article>
}

function Stays({ t, language, setLanguage, session }) {
  const [params] = useSearchParams()
  const [available, setAvailable] = useState(rooms)
  const [loading, setLoading] = useState(Boolean(params.get('checkIn')))
  const checkIn = params.get('checkIn')
  const checkOut = params.get('checkOut')
  const guests = Number(params.get('guests') || 1)
  useEffect(() => {
    if (!checkIn || !checkOut || !supabase) { setLoading(false); return }
    supabase.rpc('available_rooms', { requested_check_in: checkIn, requested_check_out: checkOut, requested_guests: guests }).then(({ data, error }) => { if (!error) setAvailable(rooms.filter(room => data.some(item => item.slug === room.id))); setLoading(false) })
  }, [checkIn, checkOut, guests])
  const query = checkIn ? `&checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}` : ''
  return <><Header t={t} language={language} setLanguage={setLanguage} session={session} /><main className="page"><p className="eyebrow">SAKAD HOMESTAYS</p><h1 className="page-title">Find your mountain home.</h1><SearchBar t={t} compact />{loading ? <p>{t.loading}</p> : <section className="stay-results">{available.filter(room => room.guests >= guests).map(room => <RoomCard room={room} language={language} query={query} key={room.id} />)}{!available.length && <p>{t.noAvailability}</p>}</section>}</main></>
}

function Checkout({ t, language, setLanguage, session }) {
  const [params] = useSearchParams(); const navigate = useNavigate()
  const room = rooms.find(item => item.id === params.get('room'))
  const checkIn = params.get('checkIn'); const checkOut = params.get('checkOut'); const guests = Number(params.get('guests') || 1)
  const [message, setMessage] = useState(''); const [submitting, setSubmitting] = useState(false)
  if (!room || !checkIn || !checkOut) return <main className="page"><Link className="underlined-link dark" to="/stays"><ArrowLeft size={17} />{t.back}</Link><p>Select dates and a room before checkout.</p></main>
  const nights = Math.max(1, Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000)); const total = nights * room.price
  const pay = async (event) => { event.preventDefault(); if (!session) { navigate(`/auth?next=${encodeURIComponent(window.location.pathname + window.location.search)}`); return } if (!supabase) { setMessage('Connect Supabase before enabling payments.'); return } const form = new FormData(event.currentTarget); setSubmitting(true); setMessage(''); const { data, error } = await supabase.functions.invoke('create-checkout-session', { body: { roomId: room.id, checkIn, checkOut, guests, fullName: form.get('fullName'), phone: form.get('phone'), specialRequest: form.get('specialRequest') } }); if (error) setMessage(error.message); else window.location.assign(data.url); setSubmitting(false) }
  return <><Header t={t} language={language} setLanguage={setLanguage} session={session} /><main className="checkout page"><Link className="underlined-link dark" to={`/stays?checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`}><ArrowLeft size={17} />{t.back}</Link><div className="checkout-grid"><section><p className="eyebrow">SECURE RESERVATION</p><h1 className="page-title">{t.checkout}</h1><form onSubmit={pay} className="guest-form"><label>Full name<input name="fullName" required defaultValue={session?.user.user_metadata.full_name || ''} /></label><label>Phone number<input name="phone" required type="tel" /></label><label>Special request<textarea name="specialRequest" rows="4" placeholder="Optional" /></label><button className="check-button" disabled={submitting}>{submitting ? t.loading : t.pay}<ArrowRight size={18} /></button>{message && <p className="form-notice">{message}</p>}</form></section><aside className="reservation-summary"><img src={room.image} alt="" /><h2>{room.name[language]}</h2><p>{checkIn} to {checkOut}</p><p>{guests} {t.guests.toLowerCase()} · {nights} nights</p><hr /><p>THB {room.price.toLocaleString()} × {nights}</p><strong>THB {total.toLocaleString()}</strong><p className="muted">{t.fullPayment}</p></aside></div></main></>
}

function Auth({ t }) {
  const [params] = useSearchParams(); const navigate = useNavigate(); const [mode, setMode] = useState('signin'); const [message, setMessage] = useState(''); const [loading, setLoading] = useState(false)
  const submit = async (event) => { event.preventDefault(); if (!supabase) { setMessage('Connect Supabase to enable accounts.'); return }; const values = new FormData(event.currentTarget); setLoading(true); const email = values.get('email'); const password = values.get('password'); const action = mode === 'signin' ? supabase.auth.signInWithPassword({ email, password }) : supabase.auth.signUp({ email, password, options: { data: { full_name: values.get('name') } } }); const { error } = await action; setLoading(false); if (error) setMessage(error.message); else if (mode === 'signup') setMessage('Check your email to confirm your account.'); else navigate(params.get('next') || '/account') }
  return <main className="auth-page"><Link className="brand" to="/"><Mountain size={26} /><span>SAKAD<em>HOMESTAYS</em></span></Link><section className="auth-card"><ShieldCheck size={26} /><p className="eyebrow">GUEST ACCOUNT</p><h1>{mode === 'signin' ? 'Welcome back.' : 'Create your account.'}</h1><form className="guest-form" onSubmit={submit}>{mode === 'signup' && <label>Full name<input name="name" required /></label>}<label>Email address<input name="email" type="email" required /></label><label>Password<input name="password" type="password" minLength="8" required /></label><button className="check-button" disabled={loading}>{loading ? t.loading : mode === 'signin' ? t.signIn : 'Create account'}<ArrowRight size={17} /></button></form>{message && <p className="form-notice">{message}</p>}<button className="switch-mode" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>{mode === 'signin' ? 'New here? Create account' : 'Already have an account? Sign in'}</button></section></main>
}

function Account({ t, language, setLanguage, session }) {
  const [reservations, setReservations] = useState([]); const navigate = useNavigate()
  useEffect(() => { if (!session) { navigate('/auth'); return } supabase?.from('reservations').select('id, reservation_code, check_in, check_out, status, total_amount').order('check_in', { ascending: false }).then(({ data }) => setReservations(data || [])) }, [session, navigate])
  if (!session) return null
  return <><Header t={t} language={language} setLanguage={setLanguage} session={session} /><main className="page"><p className="eyebrow">GUEST ACCOUNT</p><h1 className="page-title">{t.account}</h1><p>{session.user.email}</p><section className="reservation-list"><h2>Your reservations</h2>{reservations.length ? reservations.map(reservation => <article key={reservation.id}><div><strong>{reservation.reservation_code}</strong><p>{reservation.check_in} to {reservation.check_out}</p></div><span className={`status ${reservation.status}`}>{reservation.status}</span><strong>THB {(reservation.total_amount / 100).toLocaleString()}</strong></article>) : <p>No reservations yet.</p>}</section></main></>
}

function Confirmation({ t }) { const [params] = useSearchParams(); return <main className="auth-page"><section className="auth-card"><Check size={30} /><p className="eyebrow">PAYMENT RECEIVED</p><h1>Your stay is confirmed.</h1><p>Your reservation reference: <strong>{params.get('reservation') || 'will arrive by email'}</strong></p><p>We sent confirmation and receipt to your email.</p><Link className="check-button" to="/account">View reservation <ArrowRight size={17} /></Link></section></main> }
function Footer() { return <footer><div className="footer-brand"><Mountain size={25} /><span>SAKAD<em>HOMESTAYS</em></span></div><p>Sakad Village, Pua District<br />Nan 55120, Thailand</p><p className="copyright">© 2026 Sakad Homestays</p></footer> }
export default App
