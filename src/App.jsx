import { useState } from 'react'
import {
  ArrowRight, CalendarDays, Check, ChevronDown, Mail, MapPin, Menu, Minus, Mountain, Phone, Plus,
  ShieldCheck, Star, UserRound, X
} from 'lucide-react'

const rooms = [
  {
    name: 'Cloud View Cottage', tag: 'For two', price: '2,400',
    image: 'https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=1100&q=85',
    details: ['1 king bed', 'Private balcony', 'Mountain breakfast']
  },
  {
    name: 'Forest Family House', tag: 'For four', price: '4,200',
    image: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=1100&q=85',
    details: ['2 bedrooms', 'Living room', 'Valley-facing deck']
  },
  {
    name: 'Hmong Hill Cabin', tag: 'For two', price: '1,850',
    image: 'https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?auto=format&fit=crop&w=1100&q=85',
    details: ['1 queen bed', 'Garden view', 'Handcrafted interiors']
  }
]

function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [guestOpen, setGuestOpen] = useState(false)
  const [guests, setGuests] = useState(2)
  const [notice, setNotice] = useState('')

  const submitBooking = (event) => {
    event.preventDefault()
    setNotice('Availability search ready. Connect Supabase to save reservation.')
  }

  return (
    <div>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Sakad Homestays home">
          <Mountain size={26} strokeWidth={1.5} />
          <span>SAKAD<em>HOMESTAYS</em></span>
        </a>
        <nav className={menuOpen ? 'nav open' : 'nav'}>
          <a href="#stay">Stay</a><a href="#experience">Experiences</a><a href="#find-us">Find us</a><a href="#contact">Contact</a>
        </nav>
        <div className="header-actions">
          <button className="text-button" onClick={() => setAccountOpen(true)}><UserRound size={17} /> Sign in</button>
          <a className="reserve-button" href="#book">Reserve <ArrowRight size={16} /></a>
          <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation">{menuOpen ? <X /> : <Menu />}</button>
        </div>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow light">NAN, NORTHERN THAILAND</p>
            <h1>Wake up<br />above <i>clouds.</i></h1>
            <p className="hero-description">Slow mornings, mountain air, and stories shared across table. Your home in Sakad village.</p>
            <a className="underlined-link" href="#stay">Discover our homes <ArrowRight size={17} /></a>
          </div>
          <div className="hero-note"><span>18.8577° N</span><span>101.0323° E</span></div>
          <div className="scroll-cue"><span>SCROLL TO EXPLORE</span><div /></div>
        </section>

        <section className="booking-shell" id="book">
          <form className="booking-bar" onSubmit={submitBooking}>
            <label><span>CHECK IN</span><div><CalendarDays size={18} /><input type="date" aria-label="Check in date" required /></div></label>
            <label><span>CHECK OUT</span><div><CalendarDays size={18} /><input type="date" aria-label="Check out date" required /></div></label>
            <div className="guest-field">
              <span>GUESTS</span>
              <button type="button" onClick={() => setGuestOpen(!guestOpen)}><UserRound size={18} />{guests} guest{guests !== 1 ? 's' : ''}<ChevronDown size={16} /></button>
              {guestOpen && <div className="guest-popover"><span>Guests</span><div><button type="button" onClick={() => setGuests(Math.max(1, guests - 1))}><Minus size={15} /></button><strong>{guests}</strong><button type="button" onClick={() => setGuests(guests + 1)}><Plus size={15} /></button></div></div>}
            </div>
            <button className="check-button" type="submit">Check availability <ArrowRight size={18} /></button>
          </form>
          {notice && <p className="form-notice"><Check size={15} /> {notice}</p>}
        </section>

        <section className="intro section-pad" id="stay">
          <div><p className="eyebrow">A PLACE TO PAUSE</p><h2>Rooted in <i>quiet.</i><br />Made for wonder.</h2></div>
          <div className="intro-text"><p>High in Doi Phu Kha National Park, Sakad Homestays offers a different rhythm. Each stay is cared for by local families, with warm Thai hospitality and wide-open views.</p><a className="underlined-link dark" href="#experience">Our story <ArrowRight size={17} /></a></div>
        </section>

        <section className="room-grid">
          {rooms.map((room, index) => <article className={`room-card card-${index}`} key={room.name}>
            <img src={room.image} alt={room.name} />
            <div className="room-overlay"><div><p>{room.tag}</p><h3>{room.name}</h3></div><button aria-label={`View ${room.name}`}><ArrowRight size={19} /></button></div>
          </article>)}
        </section>

        <section className="experience section-pad" id="experience">
          <div className="experience-image"><img src="https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=1200&q=85" alt="Northern Thailand mountains" /><div className="image-stamp">LOCAL<br />LIFE</div></div>
          <div className="experience-copy"><p className="eyebrow">MORE THAN A STAY</p><h2>Days with<br /><i>meaning.</i></h2><p>Follow misty trails at sunrise. Learn to make Nan-style food in family kitchens. Drink tea by firelight while village stories unfold.</p><div className="feature-list"><span><Check size={17} /> Local breakfast included</span><span><Check size={17} /> Community-led experiences</span><span><Check size={17} /> Doi Phu Kha National Park</span></div><a className="solid-button" href="#contact">Explore experiences <ArrowRight size={17} /></a></div>
        </section>

        <section className="testimonial"><p className="quote-mark">“</p><blockquote>Not a hotel. A feeling we carried home with us.</blockquote><div className="stars">{[1,2,3,4,5].map(n => <Star size={15} key={n} fill="currentColor" />)}</div><p>ANNA &amp; LEO, BANGKOK</p></section>

        <section className="location" id="find-us">
          <div className="map-card"><div className="map-lines" /><MapPin className="map-pin" size={42} fill="#c75b35" /><div className="map-label">SAKAD<br />HOMESTAYS</div></div>
          <div className="location-copy"><p className="eyebrow">COME FIND US</p><h2>Far from<br />ordinary.</h2><p>Sakad village sits in the mountains of Nan province, about 2.5 hours from Nan Nakhon Airport.</p><a className="underlined-link dark" href="https://maps.google.com/?q=Sakad+Homestay+Nan+Thailand" target="_blank" rel="noreferrer">Open in Google Maps <ArrowRight size={17} /></a></div>
        </section>

        <section className="contact-banner" id="contact"><div><p className="eyebrow light">LET'S TALK</p><h2>Planning a<br /><i>mountain escape?</i></h2></div><a className="round-button" href="mailto:hello@sakadhomestays.com"><Mail size={22} /></a></section>
      </main>

      <footer><div className="footer-brand"><Mountain size={25} /><span>SAKAD<em>HOMESTAYS</em></span></div><p>Sakad Village, Pua District<br />Nan 55120, Thailand</p><div className="footer-links"><a href="tel:+6654777777"><Phone size={16} /> +66 54 777 777</a><a href="https://instagram.com">IG</a><a href="https://facebook.com">FB</a></div><p className="copyright">© 2026 Sakad Homestays</p></footer>

      {accountOpen && <AccountModal close={() => setAccountOpen(false)} />}
    </div>
  )
}

function AccountModal({ close }) {
  const [mode, setMode] = useState('login')
  const [admin, setAdmin] = useState(false)
  const [message, setMessage] = useState('')
  const submit = (event) => { event.preventDefault(); setMessage(admin ? 'Admin authentication ready for secure backend connection.' : 'Account authentication ready for secure backend connection.') }
  return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Account access"><div className="account-modal"><button className="close-modal" onClick={close} aria-label="Close"><X /></button><div className="modal-top"><ShieldCheck size={25} /><p>{admin ? 'ADMIN PORTAL' : 'GUEST ACCOUNT'}</p><h2>{mode === 'login' ? 'Welcome back.' : 'Create your account.'}</h2></div><form onSubmit={submit}><label>Email address<input type="email" placeholder="you@email.com" required /></label><label>Password<input type="password" placeholder="••••••••" required /></label>{mode === 'register' && <label>Full name<input type="text" placeholder="Your name" required /></label>}<button className="modal-submit" type="submit">{mode === 'login' ? 'Sign in' : 'Create account'} <ArrowRight size={17} /></button></form>{message && <p className="account-message">{message}</p>}<button className="switch-mode" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>{mode === 'login' ? 'New here? Create account' : 'Already have an account? Sign in'}</button><button className="admin-switch" onClick={() => setAdmin(!admin)}>{admin ? 'Guest sign in' : 'Staff? Access admin portal'}</button></div></div>
}

export default App
